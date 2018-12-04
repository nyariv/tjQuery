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
 * @class TjQueryCollection
 * @extends Array
 */
const TjQueryCollection = (() => {
  "use strict";

  /**
   * Storage holding element related data that will self delete when
   * the element no longer exists.
   */
  let elementStorage = new WeakMap();

  /**
   * tjQuery collection of Elements with mimicked jQuery api.
   * @class TjQueryCollection
   * @extends Array
   */
  class TjQueryCollection extends Array {

    /**
     * TjQueryCollection constructor.
     * @constructor
     * @param {...Element|number} items 
     */
    constructor(...items) {
      super(...items);
    }

    /**
     * Query selector shortcut.
     */
    get $() {
      return this.constructor.select.bind(this.constructor);
    }
    
    get $document()  {
      return this.constructor.$document;
    }

    /**
     * Document singleton.
     */
    static get $document()  {
      return this['#document'] = this['#document'] || new this(document);
    }
    
    /**
     * Array.map()
     * @param {function} callback 
     * @returns {Array}
     */
    map(callback) {
      let res = new this.constructor(this.length);
      for(let i = 0; i < this.length; i++) {
        res[i] = callback(i, this[i]);
      }
      return res;
    }

    /**
     * Array.sort()
     * @param {function} callback 
     */
    sort(callback) {
      if(!callback) return super.sort((a, b) => {
        if( a === b) return 0;
        if( a.compareDocumentPosition(b) & 10) {
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
      return from(this.toSet(), this.constructor);
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
      selector = select(selector);
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
      selector = select(selector, this, true);
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
      selector = select(selector, this);
      if (typeof selector === 'string') {
        return this.filter((i, elem) => elem.querySelector(':scope ' + selector));
      }
      let sel = selector instanceof TjQueryCollection ? selector : this.$(selector);
      return this.filter((i, elem) => sel.some((test) => elem !== test && elem.contains(test)));
    }

    /**
     * Filter elements that match selector, or Array.filter() if selector is a function.
     * @param {*} [selector]
     * @returns {TjQueryCollection}
     */
    filter(selector) {
      if (!selector) return super.filter((elem) => elem instanceof Element);
      if (typeof selector === 'function') {
        let res = new this.constructor();
        this.each((i, elem) => {
          if (selector(i, elem)) {
            res.push(elem);
          }
        });
        return res;
      }
      selector = select(selector, this, true);
      if (typeof selector === 'string') {
        return this.filter((i, elem) => elem.matches(selector));
      }
      let sel = (selector instanceof TjQueryCollection ? selector : this.$(selector)).toSet();
      return this.filter((i, elem) => sel.has(elem));
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
      return this.$(selector, this);
    }
    
    /**
     * Element.addEventListener()
     * @param {string} events 
     * @param {string} [selector] delegate selector 
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
        originalCallback = originalCallback === false ? () => false : originalCallback;
        if (typeof originalCallback !== 'function') return;

        let namespaces = namespace.split(".");
        let ev = namespaces.shift();

        this.each((index, elem) => {
          let eventsStore = getStore(elem, 'events', new Map());
          let eventContainer = eventsStore.get(ev);

          let wrapper = (e) => {
            let args = getStore(e.target, 'triggerArgs', new Map()).get(ev) || [];
            let stop = false;
            let event = new TjqEvent(e);
            if (typeof params.options === 'boolean') {
              let elem;
              eventContainer.allHandlers.forEach((container) => {
                if(typeof container.options === 'boolean' && !event.isImmediatePropagationStopped() && (elem = getEventElem(e, container.selector))) {
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
                  stop = (event.result = container.originalHandler.call(elem, newEvent, ...args)) === false || stop;
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
                if (param.options.once) {
                  setTimeout(() => elem.addEventListener(ev, wrapper, params.options));
                }
                return;
              };
              if (params.options.once) {
                container.deleteSelf();
              }
              stop = originalCallback.call(elem, event, ...args) === false;
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
     * @param {string} eventType 
     * @param {Object} [extraParams] 
     */
    trigger(eventType, extraParams) {
      let args = typeof extraParams === 'undefined' ? [] : extraParams instanceof Array ? args : [extraParams];
      let event = typeof eventType === 'object' ? eventType : new Event(eventType, {bubbles: true, cancelable: true});
      this.each((index, elem) => {
        let triggerArgsStore = getStore(elem, 'triggerArgs', new Map());
        triggerArgsStore.set(eventType, args);
        if (typeof elem[eventType] === 'function') {
          elem[eventType]();
        } else {
          elem.dispatchEvent(event);
        }
        triggerArgsStore.delete(eventType);
      });
      return this;
    }

    /**
     * Element.addEventListener()
     * @param {string} events
     * @param {function} callback 
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
      return this.on(...Object.values(params).filter((param) => typeof param !== 'undefined'));
    }
    
    /**
     * .on('click') alias. Adds accesibility support.
     * @param {function} callback 
     * @param {Object} [options] addEventListener options.
     * @returns {this}
     */
    click(data, callback, options) {
      if (!arguments.length) {
        return this.trigger('click');
      }
      
      this
        .on('click', data, callback, options)
        .not('a[href], button, input, select, textarea')
        .once('tjqAllyClick')
        .addClass('tjq-ally-click')
        .attr({
          tabindex: 0,
          role: 'button'
        })
        .on('keydown', (e) => {
          if (e.keyCode === 13 &&  // Enter key pressed
              e.currentTarget.getAttribute('aria-disabled') !== 'true') {
            e.currentTarget.click();
          }
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
     * Set/get element property.
     * @param {string|Object} key 
     * @param {*} [set] 
     * @returns {this|*}
     */
    prop(key, set) {
      if(objectOrProp(key, set, (k, v) => {
        this.each((index, elem) => {
            elem[k] = v;
        });
      })) return this;

      return this[0] ? this[0][key] : null;
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
        this.prop('value', set);
        this.trigger('change');
      }
      return this.prop('value', set);
    }

    /**
     * Element.textContent
     * @param {string} [set] 
     * @returns {this|string}
     */
    text(set) {
      return this.prop('textContent', set);
    }

    /**
     * Element.scrollTop
     * @param {number} [set] 
     * @returns {this|number}
     */
    scrollTop(set) {
      return this.prop('scrollTop', set);
    }

    /**
     * Element.scrollLeft
     * @param {number} [set] 
     * @returns {this|number}
     */
    scrollLeft(set) {
      return this.prop('scrollLeft', set);
    }

    /**
     * Get the label of the first element, as read by screen readers.
     * @param {string} [set]
     * @returns {string}
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
              (this.text() || "").trim();
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
     * @param {string} [name] 
     * @param {boolean} [force] 
     * @returns {this}
     */
    toggleClass(name, force) {
      let nameArr = name.split(' ');
      this.each((index, elem) => {
        nameArr.forEach((className) => {
          elem.classList.toggle(className, force);
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
      selector = select(selector, this, true);
      let ind = 0;
      if (typeof selector === 'undefined') {
        return this.first().prevAll().length;
      } else if (typeof selector === 'string') {
        this.each((elem) => !(elem.matches(selector) || (ind++ || false)));
        return ind >= this.length ? -1 : ind;
      }

      let sel = (selector instanceof TjQueryCollection ? selector : this.$(selector)).toSet();
      this.each((elem) => !(sel.has(elem) || (ind++ && false)));

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
      return elem  ? new this.constructor(elem) : new this.constructor();
    }

    /**
     * Element.nextElementSibling
     * @param {string} [selector]
     * @returns {TjQueryCollection}
     */
    next(selector) {
      return this.map((i, elem) => elem.nextElementSibling).filter((i, elem) => {
        return elem && (!selector || elem.matches(selector))
      });
    }

    /**
     * Element.nextElementSibling
     * @param {string} [selector]
     * @param {string} [filter]
     * @returns {TjQueryCollection}
     */
    nextUntil(selector, filter) {
      return from(propElem(this, 'nextElementSibling', filter, true, false, selector), this.constructor);
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
      return this.map((i, elem) => elem.previousElementSibling).filter((i, elem) => {
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
      return from(propElem(this, 'previousElementSibling', filter, true, false, selector, true), this.constructor);
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
      return from(propElem(this.map((i, elem) => elem.firstChild), 'nextElementSibling', selector, true, true), this.constructor);
    }
    
    /**
     * Element.parentNode
     * @param {string} [selector]
     * @returns {TjQueryCollection}
     */
    parent(selector) {
      let res = new Set();
      this.map((i, elem) => elem.parentNode).each((i, elem) => {
        if(!res.has(elem) && elem instanceof Element && (!selector || elem.matches(selector))) {
          res.add(elem);
        }
      });
      return from(res, this.constructor);
    }
    
    /**
     * Element.parentNode recursive, filtered by selector.
     * @param {string} [selector]
     * @returns {TjQueryCollection}
     */
    parents(selector) {
      return from(propElem(this, 'parentNode', selector, true), this.constructor);
    }
    
    /**
     * Element.parentNode recursive, limit to one that matches selector.
     * @param {string} selector
     * @returns {TjQueryCollection}
     */
    closest(selector) {  
      return this.$(this.map((i, elem) => elem.closest(selector)));
    }

    static get Event() {
      return Event;
    }

    /**
     * Query function to get elements
     * @param {*} selector 
     * @param {*} context 
     * @returns {TjQueryCollection}
     */
    static select(selector, context) {
      if (!selector) return new this();
      selector = select(selector, context);
      if (!context && selector === document) return new this(document);
      if (!context && selector instanceof Element) return new this(selector);
      if (!context && typeof selector === 'string') return from(document.querySelectorAll(selector), this);
      if (!context && selector instanceof this) return selector.filter().unique().sort();
      if (typeof selector === 'function') {
        this.$document.ready(selector);
        return new this();
      }
      
      let selectors = Array.prototype.isPrototypeOf(selector) ? selector : [selector];
      let $context = context ? (context instanceof this ? context : this.select(context)) : this.$document;
      let elems = new Set();
      let doFilter = !!context;
      let doSort = selectors.length > 1;
    
      for (let sel of selectors) {
        if (sel instanceof this) {
          sel.each((i, elem) => {
            if (elem instanceof Element) elems.add(elem);
          });
        } else if (sel instanceof Element) {
          if (!context && selectors.length === 1) {
            return new this(sel);
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
            return from(sel, this);
          }
          from(sel, this).each((elem) => {
            elems.add(elem);
          });
        } else if (typeof sel === 'string') {
          sel = select(sel, $context);
          if (typeof sel === 'string') {
            if (!context && selectors.length === 1) {
              return from(document.querySelectorAll(sel), this);
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
          from(sel, this).each((i, elem) => {
            if(elem instanceof Element) {
              elems.add(elem);
            }
          })
        }
      }

      elems = from(elems, this);
    
      // Filter within context
      if (doFilter) {
        elems = elems.filter((i, elem) => {
          return $context.some((cont) => cont !== elem && cont.contains(elem));
        });
      }

      // Sort by apppearance
      if (doSort) {
        elems = elems.sort();
      }

      return elems;
    }

  }

  ['blur',
  'change',
  'contextmenu',
  'dblclick',
  'focus',
  'focusin',
  'focusout',
  'keydown',
  'keypress',
  'keyup',
  'mousedown',
  'mouseenter',
  'mouseleave',
  'mousemove',
  'mouseover',
  'mouseup',
  'mouseout',
  'resize',
  'scroll',
  'select',
  'submit'].forEach((ev) => {
    /**
     * @param {string} [data] 
     * @param {function} [callback] 
     * @param {Object} [options] addEventListener options. If 'true' is provided, then jquery-like .one() is assumed.
     * @returns {TjQueryCollection}
     */
    function event(data, callback, options) {
      if (arguments.length === 0) {
        this.first().trigger(ev);
      } else {
        this.on(ev, null, ...arguments);
      }
      return this;
    }
    TjQueryCollection.prototype[ev] = event;
  });

  class TjqEvent {
    constructor(e) {
      let immediateStopped = false;
      let propagationStopped = false;
      
      this['originalEvent'] = e;
      this['delegateTarget'] = e.currentTarget;
      this['isImmediatePropagationStopped'] = () => immediateStopped;
      this['isPropagationStopped'] = () => propagationStopped;
      this['isDefaultPrevented'] = () => e.defaultPrevented;
      
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

  return TjQueryCollection;

  /**
   * Get element from another element's property recursively, filtered by selector.
   * @param {TjQueryCollection} collection 
   * @param {string} prop 
   * @param {string} [selector] 
   * @param {boolean} [multiple] 
   * @returns {Set}
   */
  function propElem(collection, prop, selector, multiple, includeFirst, stopAt, reverse) {
    let res = new Set();
    let cache = new Set();
    let is = (elem, sel) => elem instanceof Element && (typeof sel === 'string' ? elem.matches(sel) : (!sel || elem === sel));
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
   * @param {typeof Array} [Class] defaults to TjQueryCollection
   * @returns {Array}
   */
  function from(object, Class) {
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

  function getEventElem(e, selector) {
    let elem = e.currentTarget;
    if(selector) {
      elem = e.target.closest(selector);
      if (elem === e.currentTarget) {
        elem = null;
      }
    }
    return elem && e.currentTarget.contains(elem) ? elem : null;
  }

  /**
   * Placeholder function for adding custom selectors.
   * @param {string} selector 
   * @param {TjQueryCollection} [context] 
   * @param {boolean} [filterParents] 
   */
  function select(selector, context, filterByParents) {
    return selector;
  }

})();

const tjQuery = TjQueryCollection.select.bind(TjQueryCollection);
