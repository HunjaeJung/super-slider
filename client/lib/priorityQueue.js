function Node(data, priority, tag, type){
    this.data = data;             // 이미지 object를 저장합니다.
    this.priority = priority;     // 이미지의 우선순위 점수를 저장합니다.
    this.tag = tag;               // 이미지를 검색하게 된 계기(태그)입니다.
    this.type = type;                // type => 0:random, 1:tag, 2:sentence
}
// What's wrong with you?
// Node.prototype.getPriority = function(){return this.priority;}
Node.prototype.toString = function(){return this.priority;}

priorityQueue = function (maxSize){
    this.heap = [];
    this.maxSize = maxSize;
    // 총 사이즈는 maxSize이고,
    // 그 중에서 random한 사진은 몇개이고,
    // tag에 의한 사진은 몇개 이고,
    // 문장에 의한 사진은 몇개인지 저장하고 있는다.
    // 이 세가지의 합은 maxSize를 넘을 수 없다.
    this.proportion = {
        random:0,
        tag:0,
        sentence:0
    };
}

// We assume priority == score. it means that data with lower score will pop
priorityQueue.prototype = {
    decAllPriority: function(){
        for(var i=0;i<this.maxSize;i++){
            this.heap[i].priority = this.heap[i].priority-1;
        }
    },
    isFull: function(){
        if(this.heap.length==this.maxSize){
            return true;
        }else{
            return false;
        }
    },
    push: function(data, priority, tag, type) {
        if(this.isFull()){
            this.pop();
        };

        if(type==0){
            this.proportion.random++;
        }else if(type==1){
            this.proportion.tag++;
        }else{
            this.proportion.sentence++;
        }

        var node = new Node(data, priority, tag, type); //create node
        var i = this.heap.push(node) //it will return last index of heap
        this.bubble(i-1)
    },
    pop: function() {
        var popNode = this.heap[0];
        var topVal = popNode.data;

        if(popNode.type==0){
            this.proportion.random--;
        }else if(popNode.type==1){
            this.proportion.tag--;
        }else{
            this.proportion.sentence--;
        }

        //we don't need to deal with no data.
        this.heap[0] = this.heap.pop(); //get last value
        this.sink(0);
        return topVal;
    },
    bubble: function(i){
        while(i>0){
            var parentIndex = (i-1) >> 1;

            if(!this.higherPriority(i, parentIndex)) break;

            this.swap(i, parentIndex);
            i = parentIndex;
        }
    },
    sink: function(i){
        while((i*2)+1 < this.heap.length){
            var leftChildIndex = (i*2)+1;
            var childIndex = 0;

            if(leftChildIndex+1 == this.heap.length){
                // if there is only leftChild
                childIndex = leftChildIndex;
            }else{
                // there are both left and right child
                var leftHigher = this.higherPriority(leftChildIndex, leftChildIndex+1);
                childIndex = leftHigher? leftChildIndex : leftChildIndex+1;
            }

            if (this.higherPriority(i,childIndex)) break;

            this.swap(i, childIndex);
            i = childIndex;
        }
    },
    swap: function(i, j){
        var temp = this.heap[i];
        this.heap[i] = this.heap[j];
        this.heap[j] = temp;
    },
    higherPriority: function(i, j){
        return this.heap[i].priority < this.heap[j].priority
    }
}
//
// queue = new priorityQueue(5);
//
// queue.push({p:'two'}, 2);
// queue.push({p:'two'}, 2);
// queue.push({p:'two'}, 2);
// queue.push({p:'two'}, 2);
// queue.push({p:'two'}, 2);
//
// queue.push({p:'three'}, 3);
// queue.push({p:'five'}, 5);
// queue.push({p:'1st one'}, 1);
// queue.push({p:'zero'}, 0);
// queue.push({p:'nine'}, 9);
// queue.push({p:'2nd one'}, 1);
// queue.push({p:'one-half'}, 0.5);
// console.log(queue.heap.toString()); // => 0,1,1,3,2,9,5
