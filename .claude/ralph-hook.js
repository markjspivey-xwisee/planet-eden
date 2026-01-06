#!/usr/bin/env node
/**
 * Ralph Loop Hook for Claude Code
 *
 * This hook intercepts Claude's stop attempts and determines whether to:
 * 1. Allow the stop (if completion signal found or max iterations reached)
 * 2. Block the stop and feed back the prompt (continue iterating)
 *
 * Based on Geoffrey Huntley's Ralph Wiggum technique.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    promptFile: 'PROMPT.md',
    fixPlanFile: '@fix_plan.md',
    completionSignal: 'RALPH_COMPLETE',
    maxIterations: 50,
    stateFile: '.claude/ralph-state.json',
    logFile: '.claude/ralph-log.txt'
};

// Load or initialize state
function loadState() {
    try {
        if (fs.existsSync(CONFIG.stateFile)) {
            return JSON.parse(fs.readFileSync(CONFIG.stateFile, 'utf8'));
        }
    } catch (e) {
        // Ignore errors, start fresh
    }
    return {
        iteration: 0,
        startTime: Date.now(),
        lastOutput: '',
        completedTasks: 0,
        totalTasks: 0
    };
}

// Save state
function saveState(state) {
    fs.writeFileSync(CONFIG.stateFile, JSON.stringify(state, null, 2));
}

// Log message
function log(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(CONFIG.logFile, logLine);
    console.error(logLine.trim()); // stderr for debugging
}

// Check if completion signal is present
function hasCompletionSignal(output) {
    return output.includes(CONFIG.completionSignal);
}

// Parse fix plan to count tasks
function parseFixPlan() {
    try {
        const content = fs.readFileSync(CONFIG.fixPlanFile, 'utf8');
        const completed = (content.match(/\[x\]/gi) || []).length;
        const incomplete = (content.match(/\[ \]/gi) || []).length;
        const inProgress = (content.match(/\[~\]/gi) || []).length;
        return {
            completed,
            incomplete,
            inProgress,
            total: completed + incomplete + inProgress
        };
    } catch (e) {
        return { completed: 0, incomplete: 0, inProgress: 0, total: 0 };
    }
}

// Check for stuck loop indicators
function isStuckLoop(state, tasks) {
    // If no progress in last 3 iterations
    if (state.iteration > 3 && state.completedTasks === tasks.completed) {
        return true;
    }
    // If all tasks complete
    if (tasks.incomplete === 0 && tasks.inProgress === 0 && tasks.completed > 0) {
        return true; // This is actually success, not stuck
    }
    return false;
}

// Main hook logic
function main() {
    const state = loadState();
    const args = process.argv.slice(2).join(' ');
    const tasks = parseFixPlan();

    state.iteration++;
    state.lastOutput = args;

    log(`Iteration ${state.iteration}/${CONFIG.maxIterations}`);
    log(`Tasks: ${tasks.completed}/${tasks.total} complete, ${tasks.incomplete} remaining`);

    // Check completion conditions
    let shouldStop = false;
    let reason = '';

    // 1. Completion signal found
    if (hasCompletionSignal(args)) {
        shouldStop = true;
        reason = 'Completion signal RALPH_COMPLETE detected';
    }

    // 2. Max iterations reached
    else if (state.iteration >= CONFIG.maxIterations) {
        shouldStop = true;
        reason = `Max iterations (${CONFIG.maxIterations}) reached`;
    }

    // 3. All tasks complete
    else if (tasks.incomplete === 0 && tasks.inProgress === 0 && tasks.completed > 0) {
        shouldStop = true;
        reason = 'All tasks in @fix_plan.md marked complete';
    }

    // 4. Stuck loop detection (same task count for 5+ iterations)
    else if (state.iteration > 5 && state.completedTasks === tasks.completed) {
        log('Warning: Possible stuck loop detected');
        // Don't stop, but log warning
    }

    // Update state
    state.completedTasks = tasks.completed;
    state.totalTasks = tasks.total;
    saveState(state);

    if (shouldStop) {
        log(`STOPPING: ${reason}`);
        console.log(JSON.stringify({
            action: 'approve',
            reason: reason,
            iterations: state.iteration,
            tasks: tasks
        }));
        process.exit(0); // Allow stop
    } else {
        log(`CONTINUING: Feeding back prompt for iteration ${state.iteration + 1}`);

        // Output the prompt to continue
        const prompt = fs.existsSync(CONFIG.promptFile)
            ? fs.readFileSync(CONFIG.promptFile, 'utf8')
            : 'Continue working on the tasks in @fix_plan.md';

        const fixPlan = fs.existsSync(CONFIG.fixPlanFile)
            ? fs.readFileSync(CONFIG.fixPlanFile, 'utf8')
            : '';

        console.log(JSON.stringify({
            action: 'block',
            reason: `Iteration ${state.iteration}: ${tasks.incomplete} tasks remaining`,
            continueWith: `## Ralph Loop - Iteration ${state.iteration}\n\n${prompt}\n\n## Current Fix Plan\n\n${fixPlan}`
        }));

        process.exit(1); // Block stop, continue loop
    }
}

// Run
main();
