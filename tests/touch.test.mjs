import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installTouchGuards} from '../dist/touch.mjs';

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, fn, options) {
      const entries = listeners.get(type) || [];
      entries.push({fn, options});
      listeners.set(type, entries);
    },
    removeEventListener(type, fn) {
      listeners.set(type, (listeners.get(type) || []).filter(entry => entry.fn !== fn));
    },
    dispatch(type, event = {}) {
      for (const {fn} of listeners.get(type) || []) fn(event);
    },
    optionsFor(type) { return listeners.get(type)?.[0]?.options; },
    count(type) { return listeners.get(type)?.length || 0; },
  };
}

function inputEvent(values = {}) {
  return {cancelable: true, prevented: false, preventDefault() { this.prevented = true; }, ...values};
}

test('touch guards stop pinch and Safari gesture zoom without blocking one-finger scrolling or taps', () => {
  const doc = eventTarget(), win = eventTarget(), visualViewport = eventTarget();
  Object.assign(win, {scrollX:0, scrollY:0, visualViewport, requestAnimationFrame:fn=>fn(), scrollTo(x,y){this.scrollX=x;this.scrollY=y;}});
  const dispose = installTouchGuards(doc, win);

  for (const type of ['gesturestart','gesturechange','gestureend']) {
    const event=inputEvent();doc.dispatch(type,event);assert.equal(event.prevented,true,type);
    assert.deepEqual(doc.optionsFor(type),{passive:false});
  }
  for (const type of ['touchstart','touchmove']) {
    const oneFinger=inputEvent({touches:[{}]});doc.dispatch(type,oneFinger);assert.equal(oneFinger.prevented,false,`${type} one finger`);
    const pinch=inputEvent({touches:[{},{}]});doc.dispatch(type,pinch);assert.equal(pinch.prevented,true,`${type} pinch`);
    assert.deepEqual(doc.optionsFor(type),{passive:false});
  }
  const tap=inputEvent();doc.dispatch('touchstart',tap);assert.equal(tap.prevented,false);
  const zoomWheel=inputEvent({ctrlKey:true});win.dispatch('wheel',zoomWheel);assert.equal(zoomWheel.prevented,true);
  const normalWheel=inputEvent();win.dispatch('wheel',normalWheel);assert.equal(normalWheel.prevented,false);

  win.scrollX=12;win.scrollY=8;visualViewport.dispatch('scroll');assert.deepEqual([win.scrollX,win.scrollY],[0,0]);
  dispose();assert.equal(doc.count('gesturestart'),0);assert.equal(doc.count('touchstart'),0);assert.equal(win.count('wheel'),0);
});

test('the game viewport disables scaling while keeping the nested hangar touch-scrollable',()=>{
  const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
  const css=readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');
  assert.match(html,/maximum-scale=1/);assert.match(html,/minimum-scale=1/);assert.match(html,/user-scalable=no/);
  assert.match(css,/body\{touch-action:manipulation/);assert.match(css,/#sky,#rise\{touch-action:none\}/);
  assert.match(css,/\.hangar-scroll\{[^}]*touch-action:pan-y/);
});
