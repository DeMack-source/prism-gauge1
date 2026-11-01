// Mixer friendliness patch — no existing mixer logic is changed.
// It only adds: explicit Pick A / Pick B buttons (the old way hid picking
// behind tapping a swatch with no label), a slider that shades from A to B
// so its direction is visible, and a plain-language mix line.
// The Mentor card and Go Deeper button are left exactly as they were.
(function(){
  var slider = document.getElementById('mix-ratio');
  if(!slider) return;
  var pickA = document.getElementById('mix-pick-a-btn');
  var pickB = document.getElementById('mix-pick-b-btn');
  if(pickA) pickA.addEventListener('click', function(){ if(typeof openPicker === 'function') openPicker('mixA'); });
  if(pickB) pickB.addEventListener('click', function(){ if(typeof openPicker === 'function') openPicker('mixB'); });
  function refresh(){
    // Run after the app's own mix update has finished.
    setTimeout(function(){
      var a = document.getElementById('mix-a-swatch');
      var b = document.getElementById('mix-b-swatch');
      var hexA = a ? a.style.background : '';
      var hexB = b ? b.style.background : '';
      if(hexA && hexB) slider.style.background = 'linear-gradient(90deg,' + hexA + ',' + hexB + ')';
      var v = parseInt(slider.value, 10) || 50;
      var line = document.getElementById('mix-plain-line');
      if(line) line.textContent = 'Mostly ' + (v < 50 ? 'A' : v > 50 ? 'B' : 'half A, half B') +
        ' — ' + (100 - v) + '% A, ' + v + '% B.';
    }, 0);
  }
  slider.addEventListener('input', refresh);
  // Picker changes update the swatches through the app's own handler; the
  // slider gradient follows on the next input, and also on tab entry.
  document.querySelectorAll('[data-tab="mixer"]').forEach(function(btn){
    btn.addEventListener('click', refresh);
  });
  refresh();
})();
