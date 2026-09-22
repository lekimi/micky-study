/* ===========================================================
   sound.js —— 倒计时语音 + 音乐提醒引擎（孩子端）
   设计原则（参考儿童专注力研究）：
   - 用浏览器原生「语音合成」说中文提醒，不捆绑大音频文件、离线可用；
   - 最后 3 秒用 Web Audio 合成轻快上行音当「倒计时音乐」；
   - 到点用一段欢快琶音 + 一句具体的夸奖，收尾有仪式感、不吓人；
   - 临近结束先「预告」一下，避免突然响让孩子措手不及（First/Then 思路）。
   只在「练字」「计算小超市」两个在设备上做的固定任务上响（四面八方要去别的 App，不出声）。
   =========================================================== */
(function (global) {
  'use strict';

  var S = global.Store;
  var _ctx = null;

  function audioCtx() {
    try {
      if (_ctx) return _ctx;
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      _ctx = new AC();
    } catch (e) { _ctx = null; }
    return _ctx;
  }

  /* 用户点「开始计时」是手势，借机解锁音频上下文（浏览器策略要求） */
  function unlock() {
    var c = audioCtx();
    if (c && c.state === 'suspended') { try { c.resume(); } catch (e) { } }
  }

  /* 一声轻音：freq 频率、dur 秒、type 波形、vol 音量 */
  function tone(freq, dur, type, vol, delay) {
    var c = audioCtx(); if (!c) return;
    try {
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      o.connect(g); g.connect(c.destination);
      var t0 = c.currentTime + (delay || 0);
      var d = dur || 0.22, v = vol || 0.18;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(v, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.start(t0); o.stop(t0 + d + 0.03);
    } catch (e) { }
  }

  /* 中文语音播报 */
  function speak(text) {
    try {
      if (!('speechSynthesis' in global)) return;
      global.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN'; u.rate = 0.98; u.pitch = 1.12; u.volume = 1;
      var vs = global.speechSynthesis.getVoices() || [];
      for (var i = 0; i < vs.length; i++) {
        if (/zh|cmn|chinese|中文|普通话/i.test((vs[i].lang || '') + (vs[i].name || ''))) { u.voice = vs[i]; break; }
      }
      global.speechSynthesis.speak(u);
    } catch (e) { }
  }

  function on() {
    try { return !!(S && S.state && S.state.sound && S.state.sound.on); } catch (e) { return false; }
  }

  /* 剩 10 秒：温柔预告 + 两声轻提示音 */
  function warn10() {
    speak('时间快到啦，最后再冲一下！');
    tone(523.25, 0.18, 'sine', 0.16, 0.15);
    tone(659.25, 0.22, 'sine', 0.16, 0.34);
  }

  /* 最后 3 / 2 / 1 秒：上行音当倒计时音乐，并轻声数出来 */
  function count(n) {
    var freq = n === 3 ? 523.25 : (n === 2 ? 587.33 : 659.25);
    tone(freq, 0.18, 'triangle', 0.2);
    speak(String(n));
  }

  /* 时间到：欢快琶音 + 一句具体的夸 */
  function finish() {
    tone(523.25, 0.18, 'sine', 0.2, 0.0);
    tone(659.25, 0.18, 'sine', 0.2, 0.16);
    tone(783.99, 0.18, 'sine', 0.2, 0.32);
    tone(1046.5, 0.34, 'sine', 0.2, 0.48);
    speak('时间到啦！你今天特别认真，给自己鼓个掌！');
  }

  var Sound = {
    on: on,
    unlock: unlock,
    speak: speak,
    warn10: warn10,
    count: count,
    finish: finish,
    tone: tone
  };

  global.Sound = Sound;
})(window);
