// @ts-check
/**
 * Tiny jQuery
 * ES6 based, stripped down jQuery to the most used bits, with all dom manipulation removed.
 *
 * Usage:
 * (($) => {
 *   $('ul > li').addClass('show').click((e) => { $(this).toggleClass('show'); });
 * })(tjQuery)
 */

/**
 * tjQuery collection of Elements with mimicked jQuery api.
 */
const tjQueryComponents = (() => {
  "use strict";

  /**
   * Storage holding element related data that will self delete when
   * the element no longer exists.
   */
  let elementStorage = new WeakMap();
  let selectorCache = new Map();

  /**
   * tjQuery collection of Elements with mimicked jQuery api.
   * @class TjQueryCollection
   * @extends Array
   */
  class TjQueryCollection extends Array {

    /**
     * TjQueryCollection constructor.
     * @constructor
     * @param {...Element|Document|number} items 
     */
    constructor(...items) {
      super(...items);
    }

    /**
     * Query selector shortcut.
     */
    get $() {
      return tjQuery;
    }

    /** @type {TjQueryCollection} */
    get $document()  {
      return TjQueryCollection.$document;
    }

    /**
     * Document singleton.
     * @type {TjQueryCollection}
     */
    static get $document()  {
      return this['#document'] = this['#document'] || new this(document);
    }
    
    /**
     * Array.map()
     * @param {*} callback 
     * @returns {Array}
     */
    map(callback) {
      let res = new Array(this.length);
      for(let i = 0; i < this.length; i++) {
        res[i] = callback(this[i], i);
      }
      return res;
    }

    /**
     * Callback for adding two numbers.
     *
     * @callback sortCallback
     * @param {*} a
     * @param {*} b
     */

    /**
     * Array.sort()
     * @param {sortCallback} [callback] 
     */
    sort(callback) {
      if(!callback) return super.sort((a, b) => {
        if( a === b) return 0;
        if( a.compareDocumentPosition(b) & 2) {
            // b comes before a
            return 1;
        }
        return -1;
      });
      return super.sort(callback);
    }

    /**
     * Remove any duplicate elements.
     */
    unique() {
      return from(this.toSet(), TjQueryCollection);
    }

    /**
     * Convert to Array.
     * @returns {Array}
     */
    toArray() {
      return from(this, Array);
    }

    /**
     * Convert to Set.
     * @returns {Set}
     */
    toSet() {
      let res = new Set();
      this.each((index, elem) => res.add(elem));
      return res;
    }

    /**
     * Array.forEach()
     * @param {function} callback 
     * @returns {this}
     */
    each(callback) {
      let cont = true;
      for (let i = 0; cont && i < this.length; i++) {
        let elem = this[i];
        cont = callback.call(elem, i, elem) !== false;
      }
      return this;
    }

    /**
     * Add elements to collection.
     * @param {*} selector
     * @param {*} [context]
     * @returns {TjQueryCollection}
     */
    add(selector, context) {
      return this.$([this, this.$(selector, context)]);
    }
    
    /**
     * Element.matches() 
     * @param {*} selector
     * @returns {boolean}
     */
    is(selector) {
      selector = TjQueryCollection.select(selector, this, true);
      if (typeof selector === 'string') {
        return this.some((elem) => elem.matches(selector));
      }

      let sel = (selector instanceof TjQueryCollection ? selector : this.$(selector)).toSet();
      return this.some((elem) => sel.has(elem));
    }
    
    /**
     * Filter by !Element.matches().
     * @param {*} selector
     * @returns {TjQueryCollection}
     */
    not(selector) {
      selector = TjQueryCollection.select(selector, this, true);
      if (typeof selector === 'string') {
        return this.filter((i, elem) => !elem.matches(selector));
      }
      let sel = (selector instanceof TjQueryCollection ? selector : this.$(selector)).toSet();
      return this.filter((i, elem) => !sel.has(elem));
    }
    
    /**
     * Filter by Element.contains().
     * @param {*} selector
     * @returns {TjQueryCollection}
     */
    has(selector) {
      selector = TjQueryCollection.select(selector, this);
      if (typeof selector === 'string') {
        let cache = new Set();
        return this.filter((i, elem) => {
          if (cache.has(elem)) {
            return true;
          }
          /**  @type {TjQueryCollection} */
          let found = from(elem.querySelectorAll(':scope ' + selector), TjQueryCollection);
          found = found.add(found.parents());
          found.each((i, e) => cache.add(e));
          return found.length;
        });
      }
      selector = selector instanceof TjQueryCollection ? selector : this.$(selector);
      return this.filter((i, elem) => selector.some((test) => elem !== test && elem.contains(test)));
    }

    /**
     * Filter elements that match selector, or Array.filter() if selector is a function.
     * @param {*} [selector]
     * @returns {TjQueryCollection}
     */
    filter(selector) {
      if (!selector) return new TjQueryCollection(...super.filter((elem) => elem instanceof Element));
      if (typeof selector === 'function') {
        let res = new TjQueryCollection();
        this.each((i, elem) => {
          if (selector(i, elem)) {
            res.push(elem);
          }
        });
        return res;
      }
      selector = TjQueryCollection.select(selector, this, true);
      if (typeof selector === 'string') {
        return this.filter((i, elem) => elem.matches(selector));
      }
      selector = (selector instanceof TjQueryCollection ? selector : this.$(selector)).toSet();
      return this.filter((i, elem) => selector.has(elem));
    }
    
    /**
     * Element.querySeletorAll()/Array.find()
     * @param {*} selector
     * @returns {TjQueryCollection}
     */
    find(selector) {
      if (typeof selector === 'function') {
        return super.find(selector);
      }
      return this.$(selector, new TjQueryCollection(...this));
    }
    
    /**
     * Element.addEventListener()
     * @param {string} events 
     * @param {string|function} [selector] delegate selector 
     * @param {string} [data] 
     * @param {function} [callback] 
     * @param {Object} [options] addEventListener options. If 'true' is provided, then jquery-like .one() is assumed.
     * @returns {this}
     */
    on(events, selector, data, callback, options) {
      let params = parseOnParams(events, selector, data, callback, options);
      params.selector = params.selector || null;
      params.options = params.options || false;

      objectOrProp(params.events, params.callback, (namespace, originalCallback) => {
        if (typeof originalCallback !== 'function' && originalCallback !== false) return;

        let namespaces = namespace.split(".");
        let ev = namespaces.shift();

        this.each((index, elem) => {
          let eventsStore = getStore(elem, 'events', new Map());
          let eventContainer = eventsStore.get(ev);

          let wrapper = (e) => {
            let args = getStore(e.target, 'triggerArgs', new Map()).get(ev) || [];
            let stop = false;
            let event = e.wrapperEvent || new TjqEvent(e);
            if (typeof params.options === 'boolean') {
              let elems = [];
              eventContainer.allHandlers.forEach((container) => {
                if (typeof container.options === 'boolean') {
                  let elem = getEventElem(e, container.selector);
                  if (elem) {
                    elems.push({elem: elem, container: container});
                  }
                  
                }
              });

              elems.sort((a, b) => {
                return a.elem === b.elem ? 0 : a.elem.contains(b.elem) ? 1 : -1;
              });

              let lastElem;
              elems.forEach((next) => {
                let container = next.container;
                let elem = next.elem;
                if(!event.isImmediatePropagationStopped() && !((stop || event.isPropagationStopped()) && lastElem !== elem)) {
                  let newEvent = Object.create(event);
                  newEvent.data = container.data;
                  newEvent.currentTarget = elem;
                  newEvent.handleObj = {
                    data: container.data,
                    handler: container.originalHandler,
                    namespace: container.namespaces.join('.'),
                    origType: ev,
                    type: ev
                  }
                  if (container.options) {
                    container.deleteSelf();
                  }
                  stop = !container.originalHandler || (event.result = container.originalHandler.call(elem, newEvent, ...args)) === false || stop;
                  lastElem = elem;
                }
              });
            } else {
              let elem = getEventElem(e, container.selector);
              event.data = container.data;
              event.currentTarget = elem;
              event.handleObj = {
                data: container.data,
                handler: container.originalHandler,
                namespace: container.namespaces.join('.'),
                origType: ev,
                type: ev
              }
              if (!elem) {
                if (params.options.once) {
                  setTimeout(() => elem.addEventListener(ev, wrapper, params.options));
                }
                return;
              };
              if (params.options.once) {
                container.deleteSelf();
              }
              stop = !originalCallback || originalCallback.call(elem, event, ...args) === false;
            }

            if (stop) {
              event.stopPropagation();
              event.preventDefault();
            }
          }

          if (!eventContainer) {
            eventContainer = {
              isMasterSet: false,
              master: wrapper,
              selectors: new Map(),
              allHandlers: new Set(),
            };
            eventsStore.set(ev, eventContainer);
          }

          let sel = eventContainer.selectors.get(params.selector);
          if (!sel) {
            sel = new Map();
            eventContainer.selectors.set(params.selector, sel);
          }

          let handlers = sel.get(originalCallback);
          if (!handlers) {
            handlers = new Set();
            sel.set(originalCallback, handlers);
          }

          let container = {
            eventType: ev,
            options: params.options,
            namespaces: namespaces,
            selector: params.selector,
            data: params.data,
            handler: typeof params.options !== 'boolean' ? wrapper : null,
            originalHandler: originalCallback,
            deleteSelf: () => {
              handlers.delete(container);
              eventContainer.allHandlers.delete(container);
              if (!sel.size) {
                eventContainer.selectors.delete(params.selector);
              }
            },
          };

          handlers.add(container);
          eventContainer.allHandlers.add(container);

          if (typeof params.options !== 'boolean') {
            elem.addEventListener(ev, wrapper, params.options);
          } else if (!eventContainer.isMasterSet) {
            eventContainer.isMasterSet = true;
            eventContainer.master = wrapper;
            elem.addEventListener(ev, wrapper);
          }
        });
      });

      return this;
    }
    
    /**
     * Element.removeEventListener()
     * @param {string} [events] 
     * @param {string} [selector] 
     * @param {function} [callback] 
     * @returns {this}
     */
    off(events, selector, callback) {
      let params = parseOnParams(events, selector, callback);

      let off = (elem, ev, namespaces, eventContainer, handlers) => {
        if (handlers.size) {
          handlers.forEach((container) => {
            if (namespaces.every((ns) => container.namespaces.includes(ns))) {
              if (container.handler) {
                elem.removeEventListener(ev, container.handler);
              }
              container.deleteSelf();
            }
          });
          if(eventContainer.isMasterSet) {
            let allNative = from(eventContainer.allHandlers, Array).every((container) => typeof container.options !== 'boolean');  
            if (allNative) {
              eventContainer.isMasterSet = false;
              elem.removeEventListener(ev, eventContainer.master);
            }
          }
        }
      }

      if(!objectOrProp(params.events, params.callback, (namespace, originalCallback) => {
        let namespaces = namespace.split(".");
        let ev = namespaces.shift();
        this.each((index, elem) => {
          let eventStore = getStore(elem, 'events', new Map());
          let eventContainer = eventStore.get(ev) || {};
          let selectors = eventContainer.selectors || new Map();
          let handlers = (selectors.get(params.selector) || new Map()).get(originalCallback) || new Set();
          off(elem, ev, namespaces, eventContainer, handlers);
        });
      }) && (!events || typeof events === 'string')) {
        let namespaces = events && events.length ? events.split(".") : [];
        let event = namespaces.shift();
        this.each((index, elem) => {
          let eventStore = getStore(elem, 'events', new Map());
          eventStore.forEach((eventContainer, ev) => {
            if (!events || ev === event) {
              let selectors = eventContainer.selectors || new Map();
              if (params.selector) {
                (selectors.get(params.selector) || new Map()).forEach((handlers) => {
                  off(elem, ev, namespaces, eventContainer, handlers);
                });
              } else {
                let handlers = eventContainer.allHandlers || new Set();
                off(elem, ev, namespaces, eventContainer, handlers);
              }
              
            }
          })
        });
      }

      return this;
    }

    /**
     * Element.dispatchEvent()
     * @param {string|TjqEvent} eventType 
     * @param {Object} [extraParams] 
     */
    trigger(eventType, extraParams) {
      let args = typeof extraParams === 'undefined' ? [] : extraParams instanceof Array ? extraParams : [extraParams];
      let event = eventType instanceof TjqEvent ? eventType : new Event(eventType, {bubbles: true, cancelable: true});
      this.each((index, elem) => {
        let triggerArgsStore = getStore(elem, 'triggerArgs', new Map());
        triggerArgsStore.set(event.type, args);
        if (typeof elem[event.type] === 'function') {
          elem[event.type]();
        } else {
          elem.dispatchEvent(event instanceof TjqEvent ? event.originalEvent : event);
        }
        triggerArgsStore.delete(event.type);
      });
      return this;
    }

    /**
     * Element.addEventListener()
     * @param {string} events
     * @param {string|function} [selector] delegate selector 
     * @param {string} [data] 
     * @param {function} [callback] 
     * @param {Object} [options] addEventListener options.
     * @returns {this}
     */
    one(events, selector, data, callback, options) {
      let params = parseOnParams(events, selector, data, callback, options);
      if (typeof params.options === 'object') {
        params.options.once = true;
      } else {
        params.options = true;
      }
      const args = Object.values(params).filter((param) => typeof param !== 'undefined');
      return this.on(args.shift(), ...args);
    }
    
    /**
     * .on('click') alias. Adds accesibility support.
     * @param {string} [data] 
     * @param {function} [callback] 
     * @param {Object} [options] addEventListener options.
     * @returns {this}
     */
    click(data, callback, options) {
      if (!arguments.length) {
        return this.trigger('click');
      }
      
      this
        .on('click', null, data, callback, options)
        .not('a[href], button, input, select, textarea')
        .once('tjqAllyClick')
        .addClass('tjq-ally-click')
        .on('keydown', (e) => {
          if (e.keyCode === 13 &&  // Enter key pressed
              e.currentTarget.getAttribute('aria-disabled') !== 'true') {
            e.currentTarget.click();
          }
        })
        .attr({
          tabindex: 0,
          role: 'button'
        });

      return this;
    }

    /**
     * document.addEventListener('DOMContentLoaded')
     * @param {function} callback 
     * @returns {this}
     */
    ready(callback) {
      if (document.readyState === 'complete') {
        setTimeout(callback);
      } else {
        this.$document.one('DOMContentLoaded', callback);
      }
      return this;
    }

    /**
     * Triggeer on mouseenter and mouseleave
     * @param {function} handlerIn 
     * @param {function} [handlerOut] 
     */
    hover(handlerIn, handlerOut) {
      return this.mouseenter(handlerIn).mouseleave(handlerOut);
    }
    
    
    /**
     * Element.getAttribute()/setAttribute()
     * @param {string|Object} key 
     * @param {string|number} [set]
     * @returns {this|string}
     */
    attr(key, set) {
      if(objectOrProp(key, set, (k, v) => {
        this.each((index, elem) => {
          elem.setAttribute(k, v);
        });
      })) return this;
      
      return this[0] ? this[0].getAttribute(key) : null;
    }

    /**
     * Element.removeAttribute()
     * @param {string} key 
     */
    removeAttr(key) {
      this.each((index, elem) => {
        elem.removeAttribute(key);
      });
      return this;
    }

    /**
     * Remove element property.
     * @param {string} prop 
     */
    removeProp(prop) {
      this.each((index, elem) => {
          delete elem[prop];
      });
      return this;
    }
    
    /**
     * Element.value
     * @param {string|number} [set] 
     * @returns {this|string}
     */
    val(set) {
      if (typeof set !== 'undefined') {
        prop(this, 'value', set);
        this.trigger('change');
        return this;
      }
      return prop(this, 'value', set);
    }

    /**
     * Element.textContent
     * @param {string} [set] 
     * @returns {this|string}
     */
    text(set) {
      return prop(this, 'textContent', set);
    }

    /**
     * Element.scrollTop
     * @param {number} [set] 
     * @returns {this|number}
     */
    scrollTop(set) {
      return prop(this, 'scrollTop', set);
    }

    /**
     * Element.scrollLeft
     * @param {number} [set] 
     * @returns {this|number}
     */
    scrollLeft(set) {
      return prop(this, 'scrollLeft', set);
    }

    /**
     * Get the label of the first element, as read by screen readers.
     * @param {string} [set]
     * @returns {string|TjQueryCollection}
     */
    label(set) {
      if (typeof set === 'string') {
        return this.attr('aria-label', set);
      }
      
      if (!this.get(0)) return null;

      let get = (test) => test && test.length && test;
      return get(this.attr('aria-label')) || 
              get(get(this.attr('aria-labelledby')) && this.$('#' + this.attr('aria-labelledby')).label()) || 
              get(get(this.attr('id')) && this.$('label[for="'+ this.attr('id') + '"]').label()) ||
              get(this.attr('title')) || 
              get(this.attr('placeholder')) ||
              get(this.attr('alt')) || 
              (get(this.text()) || "").trim();
    }
    
    /**
     * Store/retrieve abitrary data on the element.
     * @param {string|Object} key 
     * @param {*} [set] 
     * @returns {this|*}
     */
    data(key, set) {
      if(objectOrProp(key, set, (k, v) => {
        this.each((index, elem) => {
          let data = getStore(elem, 'data', {});
          data[k] = v;
        });
      })) return this;

      if (!this[0]) return null;

      let data = getStore(this[0], 'data');
      return typeof key === 'undefined' ? data : (data || {})[key];
    }

    /**
     * Removes previously stored data.
     * @param {string} key 
     */
    removeData(key) {
      this.each((index, elem) => {
        let data = getStore(elem, 'data', {});
        delete data[key];
      });

      return this;
    }
    
    /**
     * Element.classList.add()
     * @param {string} name 
     * @returns {this}
     */
    addClass(name) {
      return this.toggleClass(name, true);
    }
    
    /**
     * Element.classList.remove()
     * @param {string} name 
     * @returns {this}
     */
    removeClass(name) {
      return this.toggleClass(name, false);
    }
    
    /**
     * Element.classList.toggle()
     * @param {string|Object} [name] 
     * @param {boolean} [force] 
     * @returns {this}
     */
    toggleClass(name, force) {
      const isObject = name instanceof Object;
      objectOrProp(name, force, (className, on) => {
        this.each((index, elem) => {
          elem.classList.toggle(className, isObject ? !!on : on);
        });
      });
      return this;
    }

    /**
     * Element.classList.contains()
     * @param {string} name 
     * @returns {boolean}
     */
    hasClass(name) {
      let nameArr = name.split(' ');
      return this.some((elem) => nameArr.every((className) => elem.classList.contains(className)));
    }
    
    /**
     * Filter elements that were not called by this function with the given identifier before.
     * @param {*} identifier 
     * @returns {TjQueryCollection}
     */
    once(identifier) {
      identifier = typeof identifier === 'undefined' ? 'once' : identifier;
      let res = this.filter((i, elem) => {
        let once = getStore(elem, 'once', new Set());
        if(!once.has(identifier)) {
          once.add(identifier);
          return true;
        }
        return false;
      });

      if(typeof identifier === 'function') {
        res.each(identifier);
      }

      return res;
    }

    /**
     * Get element.
     * @param {number} index
     * @returns {Element}
     */
    get(index) {
      return this[index < 0 ? this.length + index : index];
    }

    /**
     * Get index of matching selector within current elements.
     * @param {*} [selector] 
     * @returns {number}
     */
    index(selector) {
      selector = TjQueryCollection.select(selector, this, true);
      let ind = 0;
      if (typeof selector === 'undefined') {
        return this.first().prevAll().length;
      } else if (typeof selector === 'string') {
        this.each((elem) => !(elem.matches(selector) || (ind++ || false)));
        return ind >= this.length ? -1 : ind;
      }

      selector = (selector instanceof TjQueryCollection ? selector : this.$(selector)).toSet();
      this.each((elem) => !(selector.has(elem) || (ind++ && false)));

      return ind >= this.length ? -1 : ind;
    }

    /**
     * Get first element.
     * @returns {TjQueryCollection}
     */
    first() {
      return this.eq(0);
    }

    /**
     * Get last element.
     * @returns {TjQueryCollection}
     */
    last() {
      return this.eq(-1);
    }

    /**
     * Get element.
     * @param {number} index
     * @returns {TjQueryCollection}
     */
    eq(index) {
      let elem = this.get(index)
      return elem  ? new TjQueryCollection(elem) : new TjQueryCollection();
    }

    /**
     * Element.nextElementSibling
     * @param {string} [selector]
     * @returns {TjQueryCollection}
     */
    next(selector) {
      return new TjQueryCollection(...this.map((elem, i) => elem.nextElementSibling)).filter((i, elem) => {
        return elem && (!selector || elem.matches(selector));
      });
    }

    /**
     * Element.nextElementSibling
     * @param {string} [selector]
     * @param {string} [filter]
     * @returns {TjQueryCollection}
     */
    nextUntil(selector, filter) {
      return from(propElem(this, 'nextElementSibling', filter, true, false, selector), TjQueryCollection).sort();
    }

    /**
     * Element.nextElementSibling
     * @param {string} [selector]
     * @returns {TjQueryCollection}
     */
    nextAll(selector) {
      return this.nextUntil(undefined, selector);
    }

    /**
     * Element.previousElementSibling
     * @param {string} [selector]
     * @returns {TjQueryCollection}
     */
    prev(selector) {
      return new TjQueryCollection(...this.map((elem) => elem.previousElementSibling)).filter((i, elem) => {
        return elem && (!selector || elem.matches(selector))
      });
    }

    /**
     * Element.previousElementSibling
     * @param {string|Element} [selector]
     * @param {string} [filter]
     * @returns {TjQueryCollection}
     */
    prevUntil(selector, filter) {
      return from(propElem(this, 'previousElementSibling', filter, true, false, selector, true), TjQueryCollection).sort().reverse();
    }

    /**
     * Element.previousElementSibling
     * @param {string} [selector]
     * @returns {TjQueryCollection}
     */
    prevAll(selector) {
      return this.prevUntil(undefined, selector);
    }

    /**
     * Get all sibling elements.
     * @param {string} [selector]
     * @returns {TjQueryCollection}
     */
    siblings(selector) {
      return this.$([
        propElem(this, 'nextElementSibling', selector, true),
        propElem(this, 'previousElementSibling', selector, true, false, false, true)
      ]);
    }
    
    /**
     * Element.children
     * @param {string} [selector]
     * @returns {TjQueryCollection}
     */
    children(selector) {
      return from(propElem(this.map((elem) => elem.firstChild), 'nextElementSibling', selector, true, true), TjQueryCollection);
    }
    
    /**
     * Element.parentNode
     * @param {string} [selector]
     * @returns {TjQueryCollection}
     */
    parent(selector) {
      let res = new Set();
      this.map((elem) => elem.parentNode).forEach((elem) => {
        if(!res.has(elem) && elem instanceof Element && (!selector || elem.matches(selector))) {
          res.add(elem);
        }
      });
      return from(res, TjQueryCollection).sort();
    }
    
    /**
     * Element.parentNode recursive, filtered by selector.
     * @param {string} [selector]
     * @returns {TjQueryCollection}
     */
    parents(selector) {
      return from(propElem(this, 'parentNode', selector, true), TjQueryCollection).sort().reverse();
    }
    
    /**
     * Element.parentNode recursive, limit to first ones that match selector.
     * @param {*} selector
     * @param {*} [context]
     * @returns {TjQueryCollection}
     */
    closest(selector, context) {
      selector = TjQueryCollection.select(selector, context);
      if (context) {
        selector = this.$(selector, context);
      }
      return from(propElem(this, 'parentNode', selector), TjQueryCollection).sort();
    }

    static Event(type, extra) {
      let e = new Event(type, Object.assign({bubbles: true, cancelable: true}, extra || {}));
      return new TjqEvent(e);
    }

    /**
     * The query selector function that handles special jquery selectors. Returns original selector string if no special selectors found, otherwise a collection is returned.
     * @param {string} selector 
     * @param {TjQueryCollection} [context] 
     * @param {boolean} [isFilter] 
     */
    static select(selector, context, isFilter) {
      if (typeof selector !== 'string' || !selector.includes(":")) return selector;
      let parsed;
      if (selectorCache.has(selector)) {
        parsed = selectorCache.get(selector);
      } else {
        parsed = parseSelectors(selector, isFilter);
        selectorCache.set(selector, parsed);
      }
      if (!parsed.hasSpecial) return selector.replace(/:parent/g, ":not(:empty)");
      return selectorFilter(parsed.sections, context, isFilter);
    }

  }
  
  /**
   * @callback eventMethod
   * @param {string|function} [data] 
   * @param {function} [callback] 
   * @param {Object} [options] addEventListener options. If 'true' is provided, then jquery-like .one() is assumed.
   * @returns {TjQueryCollection}
   */
  
  /**
   * @param {string} ev
   * @returns {eventMethod}
   * */
  function eventMethod(ev) {
    return (...args) => {
    if (args.length === 0) {
      this.first().trigger(ev);
    } else {
      this.on(ev, null, ...args);
    }
    return this;
    }
  }

  TjQueryCollection.prototype['blur'] = eventMethod('blur');
  TjQueryCollection.prototype['change'] = eventMethod('change');
  TjQueryCollection.prototype['contextmenu'] = eventMethod('contextmenu');
  TjQueryCollection.prototype['dblclick'] = eventMethod('dblclick');
  TjQueryCollection.prototype['focus'] = eventMethod('focus');
  TjQueryCollection.prototype['focusin'] = eventMethod('focusin');
  TjQueryCollection.prototype['focusout'] = eventMethod('focusout');
  TjQueryCollection.prototype['keydown'] = eventMethod('keydown');
  TjQueryCollection.prototype['keypress'] = eventMethod('keypress');
  TjQueryCollection.prototype['keyup'] = eventMethod('keyup');
  TjQueryCollection.prototype['mousedown'] = eventMethod('mousedown');
  TjQueryCollection.prototype['mouseenter'] = eventMethod('mouseenter');
  TjQueryCollection.prototype['mouseleave'] = eventMethod('mouseleave');
  TjQueryCollection.prototype['mousemove'] = eventMethod('mousemove');
  TjQueryCollection.prototype['mouseover'] = eventMethod('mouseover');
  TjQueryCollection.prototype['mouseup'] = eventMethod('mouseup');
  TjQueryCollection.prototype['mouseout'] = eventMethod('mouseout');
  TjQueryCollection.prototype['resize'] = eventMethod('resize');
  TjQueryCollection.prototype['scroll'] = eventMethod('scroll');
  TjQueryCollection.prototype['select'] = eventMethod('select');
  TjQueryCollection.prototype['submit'] = eventMethod('submit');

  /**
   * @extends Event
   */
  class TjqEvent {
    type;
    originalEvent;
    constructor(e) {
      let immediateStopped = false;
      let propagationStopped = false;
      
      this['originalEvent'] = e;
      Object.defineProperty(e, 'wrapperEvent', {get: () => this});
      this['delegateTarget'] = e.currentTarget;
      this['isImmediatePropagationStopped'] = () => immediateStopped;
      this['isPropagationStopped'] = () => propagationStopped;
      this['isDefaultPrevented'] = () => e.defaultPrevented;
      
      /** @type {PropertyDescriptorMap} */
      let props = {};
      for (let prop in e) {
        if (prop === 'currentTarget') continue;
        switch (prop) {
          default:
            if (typeof e[prop] === 'function') {
              props[prop] = {get: () => () => {
                  switch (prop) {
                    case 'stopImmediatePropagation':
                      immediateStopped  = true;
                      break;
                    case 'stopPropagation':
                      propagationStopped  = true;
                      break;
                  }
                  return e[prop](...arguments)
                }
              }
            } else {
              props[prop] = {
                get: () => {
                  return e[prop];
                },
                set: (val) => {
                  return e[prop] = val;
                }
              }
            }
        }
      }
      Object.defineProperties(this, props);
    }
  }

  const $html = tjQuery('html');

  const specials = {
    visible: function() {return this.filter((i, elem) => elem.offsetParent !== null || elem === $html[0] || elem === document.body)},
    hidden: function() {return this.filter((i, elem) => elem.offsetParent === null && elem !== $html[0] && elem !== document.body)},
    has: function(val) {
      let parsed = parseSelectors(val);
      if (!parsed.hasSpecial) {
        return this.filter((i, elem) => elem.querySelector(':scope ' + val));
      }
      return this.filter((i, elem) => {
        return selectorFilter(parsed.sections, new TjQueryCollection(elem)).length;
      });
    },
    contains: function(val) {return this.filter((i, elem) => (elem.textContent || "").includes(val))},
    not: function(val) {return this.not(val);},
    checked: function() {return this.filter((i, elem) => elem.checked)},
    disabled: function() {return this.filter((i, elem) => elem.disabled)},
    enabled: function() {return this.filter((i, elem) => !elem.disabled)},
    selected: function() {return this.filter((i, elem) => elem.selected)},
    even: function() {return this.filter((i, elem) => !(i % 2))},
    odd: function() {return this.filter((i, elem) => (i % 2))},
    first: function() {return this.eq(0)},
    last: function() {return this.eq(-1)},
    root: function() {return this.filter((i, elem) => !elem.parentNode)},
    target: function() {return window.location.hash.length ? this.filter((i, elem) => elem.id === window.location.hash.substring(1)) : new TjQueryCollection()},
  }

  let selectorGroups = {
    button: "button, input[type=button]",
    checkbox: "input[type=checkbox]",
    file: "input[type=file]",
    header: "h1, h2, h3, h4, h5, h6, h7, h8",
    image: "[type=image]",
    input: "button, input, textarea, select",
    password: "input[type=password]",
    radio: "input[type=radio]",
    reset: "input[type=reset]",
    submit: "input[type=submit], button[type=submit]",
    text: "input[type=text], input:not([type])]",
  }

  for(let group in selectorGroups) {
    specials[group] = function() {return this.filter(selectorGroups[group])};
  }

  return {TjQueryCollection, tjQuery};
  

  /**
   * Query function to get elements
   * @param {*} selector 
   * @param {*} [context] 
   * @returns {TjQueryCollection}
   */
  function tjQuery(selector, context) {
    if (!selector) return new TjQueryCollection();
    selector = TjQueryCollection.select(selector, context);
    if (!context && selector === document) return new TjQueryCollection(document);
    if (!context && selector instanceof Element) return new TjQueryCollection(selector);
    if (!context && typeof selector === 'string') return from(document.querySelectorAll(selector), TjQueryCollection);
    if (!context && selector instanceof TjQueryCollection) return selector.filter().unique().sort();
    if (typeof selector === 'function') {
      TjQueryCollection.$document.ready(selector);
      return new TjQueryCollection();
    }
    
    let selectors = Array.prototype.isPrototypeOf(selector) ? selector : [selector];
    let $context = context ? (context instanceof TjQueryCollection ? context : tjQuery(context)) : TjQueryCollection.$document;
    let elems = new Set();
    let doFilter = !!context;
    let doSort = selectors.length > 1;

    if (selector === $context) return selector;

    for (let sel of selectors) {
      if (sel instanceof TjQueryCollection) {
        sel.each((i, elem) => {
          if (elem instanceof Element) elems.add(elem);
        });
      } else if (sel instanceof Element) {
        if (!context && selectors.length === 1) {
          return new TjQueryCollection(sel);
        }
        elems.add(sel)
      }  else if (sel instanceof NodeList) {
        for(let i = 0; i < sel.length; i++) {
          let elem = sel[i];
          if (elem instanceof Element) {
            elems.add(elem);
          }
        }
      } else if (sel instanceof HTMLCollection) {
        if (!context && selectors.length === 1) {
          return from(sel, TjQueryCollection);
        }
        from(sel, TjQueryCollection).each((elem) => {
          elems.add(elem);
        });
      } else if (typeof sel === 'string') {
        sel = TjQueryCollection.select(sel, $context);
        if (typeof sel === 'string') {
          if (!context && selectors.length === 1) {
            return from(document.querySelectorAll(sel), TjQueryCollection);
          }
          $context.each((i, cElem) => {
            cElem.querySelectorAll(':scope ' + sel).forEach((elem) => elems.add(elem));
          });
          if (selectors.length === 1) {
            doFilter = false;
            doSort = false;
          }
        } else {
          if (selectors.length === 1) {
            return sel;
          }
          sel.each((i, elem) => elems.add(elem));
        }
      } else if (sel instanceof Set) {
        sel.forEach((elem) => {
          if(elem instanceof Element) {
            elems.add(elem);
          }
        })
      } else {
        from(sel, TjQueryCollection).each((i, elem) => {
          if(elem instanceof Element) {
            elems.add(elem);
          }
        })
      }
    }

    let res = from(elems, TjQueryCollection);

    // Filter within context
    if (doFilter) {
      res = res.filter((i, elem) => {
        return $context.some((cont) => cont !== elem && cont.contains(elem));
      });
    }

    // Sort by apppearance
    if (doSort) {
      res = res.sort();
    }

    return res;
  }

  /**
   * Set/get element property.
   * @param {TjQueryCollection} elems 
   * @param {string|Object} key 
   * @param {*} [set] 
   * @returns {TjQueryCollection|*}
   */
  function prop(elems, key, set) {
    if(objectOrProp(key, set, (k, v) => {
      elems.each((index, elem) => {
          elem[k] = v;
      });
    })) return elems;

    return elems[0] ? elems[0][key] : null;
  }

  /**
   * Get element from another element's property recursively, filtered by selector.
   * @param {TjQueryCollection|Array} collection 
   * @param {string} prop 
   * @param {string} [selector] 
   * @param {boolean} [multiple] 
   * @param {boolean} [includeFirst] 
   * @param {string|Element|boolean} [stopAt] 
   * @param {boolean} [reverse] 
   * @returns {Set}
   */
  function propElem(collection, prop, selector, multiple, includeFirst, stopAt, reverse) {
    let res = new Set();
    let cache = new Set();
    let is = (elem, sel) => {
      if (!(elem instanceof Element)) return false;
      if (!sel) return true;
      if (typeof sel === 'string') return elem.matches(sel);
      if (sel instanceof Array) return sel.includes(elem);
      return elem === sel;
    };
    for (let i = reverse ? collection.length - 1 : 0; reverse ? i >= 0 : i < collection.length; reverse ? i-- : i++) {
      let elem = collection[i];
      if (!elem) continue;
      if (cache.has(elem)) continue;
      cache.add(elem);
      let next = elem[prop];
      if (includeFirst) {
        next = elem;
      }
      if (!next || (stopAt && is(next, stopAt))) continue;
      do {
        if (is(next, selector)) {
          res.add(next);
        }
        cache.add(next);
      } while (multiple && next && (next = next[prop]) && !cache.has(next) && (!stopAt || !is(next, stopAt)))
    }

    return res;
  }

  /**
   * Helper function for excuting by name/value or multiple object key/value pairs.
   * @param {string|object} name the string may also be space separated for multi value.
   * @param {*} [set]
   * @param {function} each 
   * @returns {boolean} whether a key/value pair was provided.
   */
  function objectOrProp(name, set, each) {
    let res = {};
    let wasSet = false;
    if (typeof name === 'string' && typeof set !== 'undefined') {
      wasSet = true;
      name.split(' ').forEach((n) => res[n] = set);
    } else if (name && typeof name === 'object') {
      wasSet = true;
      res = name;
    }
    for (let i in res) {
      each(i, res[i]);
    }
    return wasSet;
  }

  /**
   * Faster Array.from().
   * @param {Object} object 
   * @param {typeof Array|typeof TjQueryCollection} [Class] defaults to TjQueryCollection
   * @returns {*}
   */
  function from(object, Class) {
    Class = Class || TjQueryCollection;
    if (typeof object !== 'object' || !object) return new Class(); 
    if (Class.isPrototypeOf(object)) return object;
    if (object.length) {
      let i;
      let arr = new Class(object.length);
      for (i = 0; i < object.length; i++) {
        arr[i] = object[i];
      }
      return arr;
    }
    if (object.size) {
      let i = 0 ;
      let arr = new Class(object.size);
      object.forEach((item) => {
        arr[i++] = item;
      });
      return arr;
    }
    return Class.from(object);
  }

  /**
   * Get a storage container associated with an element.
   * @param {Element} elem the element.
   * @param {string} store store name.
   * @param {*} [defaultValue] default value if store does not exist.
   * @returns {*} the store object.
   */
  function getStore(elem, store, defaultValue) {
    if(!elementStorage.has(elem)) {
      elementStorage.set(elem, new Map());
    }

    let types = elementStorage.get(elem);
    if(typeof defaultValue !== 'undefined' && !types.has(store)) {
      types.set(store, defaultValue);
    }

    return types.get(store);
  }
  
  /**
   * Parses .on() arguments into a more manageble properties of an object.
   * @see TjQueryCollection.on()
   * @param {string|Object} events
   * @param {string|function} [selector]
   * @param {*} [data] 
   * @param {function} [callback] 
   * @param {boolean|Object} [options] 
   * @return {Object} object of the params as object properties.
   */
  function parseOnParams(events, selector, data, callback, options) {
    // (events, selector, data, options)
    if (typeof events !== 'string') {
      options = callback
      callback = undefined;
      // (events, data, options)
      if (typeof selector !== 'string' && selector !== null) {
        options = data;
        data = selector;
        selector = undefined;
      }
    } else {
      // (events, data, callback, options)
      if (typeof selector !== 'string' && selector !== null) {
        options = callback;
        callback = data;
        data = selector;
        selector = undefined;
      }
      if (typeof data === 'function') {
        options = callback;
        callback = data;
        data = undefined;
      }
    }
    return {events, selector, data, callback, options};
  }

  /**
   * Helper function for detecting the appropiate currentTarget of an event.
   * @param {Event} e 
   * @param {string} selector 
   * @returns {Element|Document|null} currentTarget, null if not valid.
   */
  function getEventElem(e, selector) {
    let elem = e.currentTarget;
    if(selector && e.target instanceof Element) {
      elem = e.target.closest(selector);
      if (elem === e.currentTarget) {
        elem = null;
      }
    }
    if (elem instanceof Document) return elem;
    return elem instanceof Element && e.currentTarget instanceof Element && e.currentTarget.contains(elem) ? elem : null;
  }

  /**
   * Helper function to split a selector string into sections (comma separated selectors) and levels (space separated selectors) per section.
   * @param {string} s selector
   * @returns {Array} Array of sections, which have arrays of levels.
   */
  function splitChar (s) {
    let partStart = 0;
    var parts = [];
    let innerCount = 0;
    var section = [];
    var level = [];
    section.push(level);
    parts.push(section);
    let newSection = false;
    for (let i = 0; i < s.length; i++) {
      if (!innerCount && ~", :".indexOf(s[i])) {
        if(s[i] === ',') {
          section = [];
          parts.push(section);
          level = [];
          section.push(level);
          newSection = true;
        } else if (s[i] === " ") {
          if (!newSection) {
            let p = s.substring(partStart, i).trim();
            if (p.length) {
              level.push(p);
            }
            level = [];
            section.push(level);
          }
        } else {
          let p = s.substring(partStart, i).trim();
          if (p.length) {
            level.push(p);
          }
        }
        partStart = i + 1;
      } else if (s[i] === '(') {
        innerCount++;
      } else if (s[i] === ')') {
        innerCount--;
      }
      if (s[i] !== ' ') {
        newSection = false;
      }
    }
    let p = s.substring(partStart).trim();
    if (p.length) {
      level.push(p);
    }
    return parts;
  }

  /**
   * Helper function to extract special selectors from a selector string.
   * @param {string} s Selector string.
   * @param {boolean} [isFilter]
   * @returns {Object} A map with hasSpecial falg, and sections.
   */
  function parseSelectors (s, isFilter) {
    let hasSpecial = false;
    let sections = splitChar(s);
    for (let sec in sections) {
      let levels = sections[sec];
      /** @type {*} */
      let parts = [];
      let reg = "";
      let regCount = 0;
      for (let level = 0; level < levels.length; level++) {
        let subSelectors = levels[level];
        let subs = [];
        reg = "";
        for (let sub of subSelectors) {
          let parePos = sub.indexOf("(");
          let arg;
          if (~parePos) {
            arg = sub.substring(parePos + 1, sub.length - 1);
            sub = sub.substring(0, parePos);
          }
          if (sub === "parent") {
            subs.push(":not(:empty)");
          } else if (specials[sub]) {
            subs.push([sub, arg]);
            hasSpecial = true;
          } else {
            subs.push(sub);
          }
        }
        let specs = [];
        for (let i in subs) {
          if (subs[i] instanceof Array) {
            if (subs[i][0] === 'parent' && level < levels.length - 1) {

            } else {
              specs.push(subs[i]);
            }
          } else {
            reg += subs[i];
          }
        }
        if (reg.length) {
          if (typeof parts[parts.length - 1] === 'string') {
            reg = parts[parts.length - 1] = parts[parts.length - 1] + " " + reg;
          } else{
            regCount++;
            parts.push(reg);
          }
        } else {
          if (typeof parts[parts.length - 1] === 'string') {
            reg = parts[parts.length - 1] = parts[parts.length - 1] + " *";
          } else {
            regCount++;
            if (regCount == 1 && isFilter) {
            } else {
              parts.push("*"); 
            parts.push("*"); 
              parts.push("*"); 
            }
          }
        }
        parts = parts.concat(specs);
      }
      parts.nativeSelector = parts.filter((item) => typeof item === 'string').join(' ');
      parts.nativeSelector = parts.nativeSelector.length ? parts.nativeSelector : '*'
      parts.nativePartsCount = regCount;
      sections[sec] = parts;
    }
    return {hasSpecial, sections};
  }

  /**
   * 
   * @param {Array} parsed Selecotr sections and levels array with defined special selectors.
   * @param {TjQueryCollection} context Context to limit elements to find.
   * @param {boolean} [isFilter]
   */
  function selectorFilter(parsed, context, isFilter) {
    let all = [];
    context = context || new TjQueryCollection(document);
    context.forEach((elem) => {
      let current = new TjQueryCollection(elem);
      for(let i = 0; i < parsed.length; i++) {
        let section = Object.assign([], parsed[i]);
        let part;
        let past = [];
        while(part = section.shift()) {
          if (typeof part === 'string') {
            past.push(part);
            if (isFilter) {
              current = current.filter(past.join(" "));
            } else {
              current = current.find(part);
            }
          } else {
            current = specials[part[0]].call(current, part[1]);
          }
        }
        if (current.length) {
          all.push(current);
        }
      }
    });

    return all.length > 1 ? tjQuery(all) : (all.length ? all[0] : new TjQueryCollection());
  }

})();

const {TjQueryCollection, tjQuery} = tjQueryComponents;