function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //최댓값은 제외, 최솟값은 포함
}

function getCurrentMillis(){
    return new Date().getTime();
}

function dlog(x, y){
    return Math.log(y) / Math.log(x);
}

CanvasRenderingContext2D.prototype.setColor = function(color){
    this.fillStyle = color;
}