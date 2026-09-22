/* ===========================================================
   asr.js —— 语音转文字（讲述/写话的口语输入）
   用浏览器原生 Web Speech Recognition（Chrome/Edge 自带，不用装东西、不用联网授权）。
   设计上针对 Micky 的情况：说话容易打绊、重复、逻辑乱。
   所以：
   - 只把「最终结果」追加进输入框，「临时结果」只显示在状态条上（不然会重复叠加）
   - 配合 speech.js 的 tidyText()：说完点「整理一下」去掉口癖和重复
   - 不支持的浏览器直接给出提示，不假装能用
   =========================================================== */
(function (global) {
  'use strict';

  var rec = null, listening = false;

  function supported() {
    return !!(global.SpeechRecognition || global.webkitSpeechRecognition);
  }

  function start(onInterim, onFinal, onErr) {
    if (!supported()) { if (onErr) onErr('unsupported'); return false; }
    stop();
    var C = global.SpeechRecognition || global.webkitSpeechRecognition;
    try { rec = new C(); } catch (e) { if (onErr) onErr('init'); return false; }
    rec.lang = 'zh-CN';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = function (e) {
      var interim = '', fin = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var r = e.results[i];
        var t = (r[0] && r[0].transcript) || '';
        if (r.isFinal) fin += t; else interim += t;
      }
      if (fin && onFinal) onFinal(fin);
      if (interim && onInterim) onInterim(interim);
    };
    rec.onerror = function (e) { listening = false; if (onErr) onErr((e && e.error) || 'error'); };
    rec.onend = function () { listening = false; };
    try { rec.start(); listening = true; return true; }
    catch (e) { if (onErr) onErr('start'); return false; }
  }

  function stop() {
    try { if (rec) rec.stop(); } catch (e) { }
    rec = null; listening = false;
  }

  global.Asr = {
    supported: supported,
    start: start,
    stop: stop,
    isOn: function () { return listening; }
  };
})(window);
