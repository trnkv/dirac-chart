class MinHeap {
    constructor() { this.data = []; }
    size() { return this.data.length; }
    peek() { return this.data[0]; }
    push(val) {
        this.data.push(val);
        this._bubbleUp();
    }
    pop() {
        if (this.data.length === 1) return this.data.pop();
        const min = this.data[0];
        this.data[0] = this.data.pop();
        this._bubbleDown();
        return min;
    }
    _bubbleUp() {
        let idx = this.data.length - 1;
        while (idx > 0) {
            let parentIdx = Math.floor((idx - 1) / 2);
            if (this.data[idx] >= this.data[parentIdx]) break;
            [this.data[idx], this.data[parentIdx]] = [this.data[parentIdx], this.data[idx]];
            idx = parentIdx;
        }
    }
    _bubbleDown() {
        let idx = 0;
        const length = this.data.length;
        while (true) {
            let left = 2 * idx + 1;
            let right = 2 * idx + 2;
            let smallest = idx;
            if (left < length && this.data[left] < this.data[smallest]) smallest = left;
            if (right < length && this.data[right] < this.data[smallest]) smallest = right;
            if (smallest === idx) break;
            [this.data[idx], this.data[smallest]] = [this.data[smallest], this.data[idx]];
            idx = smallest;
        }
    }
}