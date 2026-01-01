/**
 * True Neural Network Implementation
 * Multi-layer feedforward network with full behavioral control
 */

export class NeuralNetwork {
    constructor(inputCount, hiddenCount, outputCount) {
        this.inputCount = inputCount;
        this.hiddenCount = hiddenCount;
        this.outputCount = outputCount;

        // Initialize weights with Xavier initialization for better learning
        this.weightsIH = this.createMatrix(inputCount, hiddenCount);
        this.weightsHO = this.createMatrix(hiddenCount, outputCount);
        this.biasH = Array(hiddenCount).fill(0).map(() => (Math.random() - 0.5) * 0.5);
        this.biasO = Array(outputCount).fill(0).map(() => (Math.random() - 0.5) * 0.5);
    }

    createMatrix(rows, cols) {
        const limit = Math.sqrt(6 / (rows + cols)); // Xavier initialization
        return Array(rows).fill().map(() =>
            Array(cols).fill().map(() => (Math.random() * 2 - 1) * limit)
        );
    }

    // Activation function - tanh for better gradient flow
    activate(x) {
        return Math.tanh(x);
    }

    // Forward propagation - returns multiple outputs for full control
    predict(inputs) {
        // Input to hidden layer
        const hidden = [];
        for (let h = 0; h < this.hiddenCount; h++) {
            let sum = this.biasH[h];
            for (let i = 0; i < this.inputCount; i++) {
                sum += inputs[i] * this.weightsIH[i][h];
            }
            hidden.push(this.activate(sum));
        }

        // Hidden to output layer
        const outputs = [];
        for (let o = 0; o < this.outputCount; o++) {
            let sum = this.biasO[o];
            for (let h = 0; h < this.hiddenCount; h++) {
                sum += hidden[h] * this.weightsHO[h][o];
            }
            outputs.push(this.activate(sum));
        }

        return outputs;
    }

    // Mutation for evolution - critical for learning
    mutate(mutationRate = 0.1) {
        const mutateValue = (val) => {
            if (Math.random() < mutationRate) {
                // Small random change
                return val + (Math.random() - 0.5) * 0.5;
            }
            return val;
        };

        // Mutate all weights
        this.weightsIH = this.weightsIH.map(row => row.map(mutateValue));
        this.weightsHO = this.weightsHO.map(row => row.map(mutateValue));
        this.biasH = this.biasH.map(mutateValue);
        this.biasO = this.biasO.map(mutateValue);
    }

    // Clone for reproduction
    clone() {
        const copy = new NeuralNetwork(this.inputCount, this.hiddenCount, this.outputCount);
        copy.weightsIH = this.weightsIH.map(row => [...row]);
        copy.weightsHO = this.weightsHO.map(row => [...row]);
        copy.biasH = [...this.biasH];
        copy.biasO = [...this.biasO];
        return copy;
    }

    // Export for analysis
    export() {
        return {
            architecture: {
                inputs: this.inputCount,
                hidden: this.hiddenCount,
                outputs: this.outputCount
            },
            weightsIH: this.weightsIH,
            weightsHO: this.weightsHO,
            biasH: this.biasH,
            biasO: this.biasO
        };
    }
}
