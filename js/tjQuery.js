  /**
   * Tiny jQuery
   * ES6 based, stripped down jQuery to the most used bits, with all dom manipulation removed.
   *
   * Usage:
   * (($) => {
   *   $('ul > li').addClass('show').click((e) => { $(this).toggleClass('show'); });
   * })(tjQuery)
   */

  const tjQuery = (() => {
    "use strict";

    let elementStorage = new WeakMap();

    class TjQueryCollection extends Array {
      
      /**
       * TjQueryCollection constructor.
       * @constructor
       * @param {...Element} items 
       */
      constructor() {
          super(...arguments);
      }
      
      /**
       * Array.map()
       * @param {function} callback 
       * @returns {Array}
       */
      map(callback) {
        return this.toArray().map(callback);
      }

      /**
       * Convert to Array.
       * @returns {Array}
       */
      toArray() {
        return from(this, Array);
      }

      /**
       * Array.forEach()
       * @param {function} callback 
       * @returns {this}
       */
      each(callback) {
        this.forEach(callback);
        return this;
      }

      /**
       * Add elements to collection.
       * @param {*} selector
       * @param {*} [context]
       * @returns {TjQueryCollection}
       */
      add(selector, context) {
        return $([this, $(selector, context)]);
      }
      
      /**
       * Element.matches() 
       * @param {*} selector
       * @returns {boolean}
       */
      is(selector) {
        if (typeof selector === "string") {
          return this.some((elem) => elem.matches(selector));
        } else {
          let test = $(selector);
          return this.some((elem) => test.includes(elem));
        }
      }
      
      /**
       * Filter by !Element.matches().
       * @param {*} selector
       * @returns {TjQueryCollection}
       */
      not(selector) {
        if (typeof selector === 'string') {
          return this.filter((elem) => !elem.matches(selector));
        }
        let sel = $(selector);
        return this.filter((elem) => !sel.includes(elem));
      }
      
      /**
       * Filter by Element.contains().
       * @param {*} selector
       * @returns {TjQueryCollection}
       */
      has(selector) {
        if (typeof selector === 'string') {
          return this.filter((elem) => elem.querySelectorAll(selector).length);
        }
        let sel = $(selector);
        return this.filter((elem) => sel.some((test) => elem !== test && elem.contains(test)));
      }

      /**
       * Filter elements that match selector, or Array.filter() if selector is a function.
       * @param {*} selector
       * @returns {TjQueryCollection}
       */
      filter(selector) {
        if (typeof selector === 'function') {
          return from(this.toArray().filter(selector));
        }
        if (typeof selector === 'string') {
          return this.filter((elem) => elem.matches(selector));
        }
        let sel = $(selector);
        return this.filter((elem) => sel.includes(elem));
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
        return $(selector, this);
      }
      
      /**
       * Element.addEventListener()
       * @param {string} events 
       * @param {string} [selector] delegate selector 
       * @param {function} callback 
       * @param {Object} [options] addEventListener options.
       * @returns {this}
       */
      on(events, selector, data, callback, options) {
        let params = parseOnParams(events, selector, data, callback, options);

        objectOrProp(params.events, params.callback, (namespace, originalCallback) => {
          let namespaces = namespace.split(".");
          let ev = namespaces.shift();

          let wrapper = (e) => {
            if (!params.selector || e.target.matches(params.selector)) {
              let handlerObj = e;
              handlerObj.data = params.data;
              originalCallback(handlerObj);
            }
          };

          this.each((elem) => {
            let eventsStore = getStore(elem, 'events', new Map());

            let event = eventsStore.get(ev);
            if (!event) {
              event = new Map();
              eventsStore.set(ev, event);
            }

            let sel = event.get(params.selector);
            if (!sel) {
              sel = new Map();
              event.set(params.selector, sel);
            }

            let handlers = sel.get(originalCallback);
            if (!handlers) {
              handlers = new Set();
              sel.set(originalCallback, handlers);
            }

            handlers.add({ 
              namespaces: namespaces,
              handler: wrapper,
              originalHandler: originalCallback
            });

            elem.addEventListener(ev, wrapper, params.options);
          });
        });

        return this;
      };
      
      /**
       * Element.removeEventListener()
       * @param {string} events 
       * @param {function} callback 
       * @returns {this}
       */
      off(events, selector, callback) {
        let params = parseOnParams(events, selector, callback);
        objectOrProp(params.events, params.callback, (namespace, originalCallback) => {
          let namespaces = namespace.split(".");
          let ev = namespaces.shift();
          this.each((elem) => {
            let eventsStore = getStore(elem, 'events', new Map());
            let event = eventsStore.get(ev) || new Map();
            let sel = event.get(params.selector) || new Map();
            let handlers = sel.get(originalCallback) || new Set();
            handlers.forEach((container) => {
              if (namespaces.every((ns) => container.namespaces.includes(ns))) {
                elem.removeEventListener(ev, container.handler);
                handlers.delete(container);
                if (!handlers.size) {
                  sel.delete(originalCallback);
                  if(!sel.size) {
                    event.delete(params.selector);
                    if (!event.size) {
                      eventsStore.delete(ev);
                    }
                  }
                }
              }
            });
            elem.removeEventListener(ev, originalCallback);
          });
        });

        return this;
      }

      /**
       * Element.dispatchEvent()
       * @param {string} eventType 
       * @param {Object} [extraParams] 
       */
      trigger(eventType, extraParams) {
        let event = new Event(eventType, extraParams);
        return this.each((elem) => {
          elem.dispatchEvent(event);
        });
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
        params.options = params.options || {};
        params.options.once = true;
        return this.on(...Object.values(params).filter((param) => param));
      };
      
      /**
       * .on('click') alias. Adds accesibility support.
       * @param {function} callback 
       * @param {Object} [options] addEventListener options.
       * @returns {this}
       */
      click(data, callback, options) {
        if (!arguments.length) {
          return this.each((elem) => {
            elem.click();
          });
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
          callback();
        } else {
          $document.one('DOMContentLoaded', callback);
        }
        return this;
      }
      
      /**
       * Element.getAttribute()/setAttribute()
       * @param {string|Object} key 
       * @param {string|number} [set]
       * @returns {this|string}
       */
      attr(key, set) {
        if(objectOrProp(key, set, (k, v) => {
          this.each((elem) => {
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
        return this.each((elem) => {
          elem.removeAttribute(key);
        });
      }

      /**
       * Set/get element property.
       * @param {string|Object} key 
       * @param {*} [set] 
       * @returns {this|*}
       */
      prop(key, set) {
        if(objectOrProp(key, set, (k, v) => {
          this.each((elem) => {
              elem[k] = v;
          });
        })) return this;

        return this[0] ? this[0][key] : null;
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
               get(get(this.attr('aria-labelledby')) && $('#' + this.attr('aria-labelledby')).label()) || 
               get(get(this.attr('id')) && $('label[for="'+ this.attr('id') + '"]').label()) ||
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
          this.each((elem) => {
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
        this.each((elem) => {
          elem.tjqData = elem.tjqData || {};
          delete elem.tjqData[key];
        });

        return this;
      }
      
      /**
       * Element.focus()
       * @param {function} [callback] 
       * @param {Object} [options] addEventListener options.
       * @returns {this}
       */
      focus(data, callback, options) {
        if (!arguments.length && this[0] && typeof this[0].focus === 'function') {
          this[0].focus();
        } else if (arguments.length) {
          this.on('focus', data, callback, options);
        }

        return this;
      }
      
      /**
       * Element.focus()
       * @param {function} [callback] 
       * @param {Object} [options] addEventListener options.
       * @returns {this}
       */
      blur(data, callback, options) {
        if (!arguments.length && this[0] && typeof this[0].blur === 'function') {
          this[0].blur();
        } else if (arguments.length) {
          this.on('blur', data, callback, options);
        }

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
        this.each((elem) => {
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
        let res = this.filter((elem) => {
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
        let ind = 0;
        if (typeof selector === 'undefined') {
          return this.first().parent().children().indexOf(this.get(0));
        } else if (typeof selector === 'string') {
          this.some((elem) => elem.matches(selector) || (ind++ && false));
        } else {
          let sel = $(selector);
          this.some((elem) => sel.includes(elem) || (ind++ && false));
        }

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
        return this.get(index) ? new TjQueryCollection(this.get(index)) : new TjQueryCollection();
      }

      /**
       * Element.nextElementSibling
       * @param {string} [selector]
       * @returns {TjQueryCollection}
       */
      next(selector) {
        return from(this.map((elem) => elem.nextElementSibling).filter((elem) => {
          return elem && (!selector || elem.matches(selector))
        }));
      }

      /**
       * Element.nextElementSibling
       * @param {string} [selector]
       * @param {string} [filter]
       * @returns {TjQueryCollection}
       */
      nextUntil(selector, filter) {
        return from(propElem(this, 'nextElementSibling', filter, true, false, selector));
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
        return from(this.map((elem) => elem.previousElementSibling).filter((elem) => {
          return elem && (!selector || elem.matches(selector))
        }));
      }

      /**
       * Element.previousElementSibling
       * @param {string|Element} [selector]
       * @param {string} [filter]
       * @returns {TjQueryCollection}
       */
      prevUntil(selector, filter) {
        return from(propElem(this, 'previousElementSibling', filter, true, false, selector, true));
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
        return $([
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
        return from(propElem(this.map((elem) => elem.firstChild), 'nextElementSibling', selector, true, true));
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
        return from(res);
      }
      
      /**
       * Element.parentNode recursive, filtered by selector.
       * @param {string} [selector]
       * @returns {TjQueryCollection}
       */
      parents(selector) {
        return from(propElem(this, 'parentNode', selector, true));
      }
      
      /**
       * Element.parentNode recursive, limit to one that matches selector.
       * @param {string} selector
       * @returns {TjQueryCollection}
       */
      closest(selector) {  
        return $(this.map((elem) => elem.closest(selector)));
      }
      
    }
    
    let $document = new TjQueryCollection(document);
    return $;
    
    /**
     * Query function to get elements
     * @param {*} selector 
     * @param {*} context 
     * @returns {TjQueryCollection}
     */
    function $(selector, context) {
      if (!selector) return new TjQueryCollection();
      if (!context && selector === document) return new TjQueryCollection(document);
      if (typeof selector === 'function') {
        $document.ready(selector);
        return new TjQueryCollection();
      }
      
      let selectors = selector instanceof Array ? selector : [selector];
      let c = context ? (context instanceof TjQueryCollection ? context : $(context)) : $document;
      let elems = new Set();
      let skipFilter = false;
    
      for (let sel of selectors) {
        if (sel instanceof TjQueryCollection) {
          if (!context && selectors.length === 1) {
            return sel;
          }
          sel.forEach((elem) => elems.add(elem));
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
            return from(sel);
          }
          from(sel, Array).forEach((elem) => {
            elems.add(elem);
          });
        } else if (typeof sel === 'string') {
          if (!context && selectors.length === 1) {
            return from(document.querySelectorAll(sel));
          }
          c.each((cElem) => {
            cElem.querySelectorAll(sel).forEach((elem) => elems.add(elem));
          });
          if (selectors.length === 1) {
            skipFilter = true;
          }
        } else if (sel instanceof Set) {
          sel.forEach((elem) => {
            if(elem instanceof Element) {
              elems.add(elem);
            }
          })
        } else {
          from(sel).forEach((elem) => {
            if(elem instanceof Element) {
              elems.add(elem);
            }
          })
        }
      }
      elems = from(elems);
    
      // Filter within context
      if (context && !skipFilter) {
        elems = elems.filter((elem) => {
          return c.some((cont) => cont !== elem && cont.contains(elem));
        });
      }

      // Sort by apppearance
      if (selectors.length > 1) {
        elems = elems.sort(sort);
      }

      return elems;
    }

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
      let is = (elem, sel) => typeof sel === 'string' ? elem.matches(sel) : elem === sel;
      (reverse ? collection.slice().reverse() : collection).forEach((elem) => {
        if (!elem) return;
        if (cache.has(elem)) return;
        cache.add(elem);
        let next = elem[prop];
        if (includeFirst) {
          next = elem;
        }
        if (!next || (stopAt && is(next, stopAt))) return;
        do {
          if (next instanceof Element && (!selector || next.matches(selector))) {
            res.add(next);
          }
          cache.add(next);
        } while (multiple && next && (next = next[prop]) && !cache.has(next) && (!stopAt || !is(next, stopAt)))
      });

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
      } else if (typeof name === 'object') {
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
      Class = typeof Class === 'undefined' ? TjQueryCollection : Class;
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
    
    function sort(a, b) {
      if( a === b) return 0;
      if( a.compareDocumentPosition(b) & 10) {
          // b comes before a
          return 1;
      }
      return -1;
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
        if (typeof selector !== 'string') {
          options = data;
          data = selector;
          selector = undefined;
        }
      } else {
        // (events, data, callback, options)
        if (typeof selector !== 'string') {
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

  })();
