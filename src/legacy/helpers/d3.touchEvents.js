function detectTouchEvent(element, onTap, onLongTap) {
  var start;
  var coordX;
  var coordY;
  var namespace = onTap ? ".onTap" : ".onLongTap";
  d3.select(element)
    .on("touchstart" + namespace, function(event) {
      start = event.timeStamp;
      coordX = event.changedTouches[0].screenX;
      coordY = event.changedTouches[0].screenY;
    })
    .on("touchend" + namespace, function(event, d) {
      coordX = Math.abs(coordX - event.changedTouches[0].screenX);
      coordY = Math.abs(coordY - event.changedTouches[0].screenY);
      if (coordX < 5 && coordY < 5) {
        if (event.timeStamp - start < 500)
          return onTap ? onTap(event, d) : undefined;
        return onLongTap ? onLongTap(event, d) : undefined;
      } else return undefined;
    });
}

//d3.selection.prototype.onTap
var onTap = function(callback) {
  return this.each(function() {
    detectTouchEvent(this, callback);
  });
};

//d3.selection.prototype.onLongTap
var onLongTap = function(callback) {
  return this.each(function() {
    detectTouchEvent(this, null, callback);
  });
};

export default {
  onTap: onTap,
  onLongTap: onLongTap
};

export {
  onTap,
  onLongTap
};
