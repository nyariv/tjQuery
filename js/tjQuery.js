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
        return from(this, Array).map(callback, this);
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
          return from(Array.prototype.filter.call(this, selector));
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
          return $(from(this, Array).find(selector, this));
        } else if (typeof selector === 'string') {
          return $(this.map((elem) => elem.querySelectorAll(selector)));
        }
        return $(selector, this);
      }
      
      /**
       * Element.addEventListener()
       * @param {string} type 
       * @param {string} [selector] delegate selector 
       * @param {function} callback 
       * @param {Object} [options] addEventListener options.
       * @returns {this}
       */
      on(events, selector, callback, options) {
        if (typeof selector === 'string') {
          let originalCallback = callback;
          callback = (e) => {
            if (e.target.matches(selector)) {
              originalCallback(e);
            }
          };
          callback.originalCallback = originalCallback;
          originalCallback.tjqHanlers = originalCallback.tjqHanlers || [];
          originalCallback.tjqHandlers.push(callback);
        } else {
          options = callback;
          callback = selector;
        }
        objectOrProp(events, callback, (k, v) => {
          this.each((elem) => {
            let $elem = $(elem);
            let events = $elem.data('___events___') || {};
            if (!events[k]) {
              events[k] = new Set()
              $elem.data('___events___', events);
            }
            events[k].add(v);
            elem.addEventListener(k, v, options);
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
      off(events, callback) {
        if(!objectOrProp(events, callback, (k, v) => {
          let handlers = callback.tjqHandlers || [];
          handlers.push(v);
          this.each((elem) => {
            handlers.forEach((handler) => {
              elem.removeEventListener(k, handler);
            })
          });
        })) {
          let evs = [];
          if (typeof events === 'string') {
            evs = events.split(' ');
          }
          this.each((elem) => {
            let handlers = $(elem).data('___events___') || {};
            if (typeof events === 'undefined') {
              evs = Object.keys(handlers)
            }
            evs.forEach((ev) => {
              (handlers || []).forEach((handler) => {
                elem.removeEventListener(ev, handler);
              });
              delete handlers[ev];
            });
          });
        }
        return this;
      }

      /**
       * Element.addEventListener()
       * @param {string} type 
       * @param {function} callback 
       * @param {Object} [options] addEventListener options.
       * @returns {this}
       */
      one(events, callback, options) {
        options = options || {};
        options.once = true;
        return this.on(events, callback, options);
      };

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
       * .on('click') alias. Adds accesibility support.
       * @param {function} callback 
       * @param {Object} [options] addEventListener options.
       * @returns {this}
       */
      click(callback, options) {
        if (typeof callback === 'undefined') {
          return this.each((elem) => {
            elem.click();
          });
        }
        
        this
          .on('click', callback, options)
          .not('a[href], button, input, select, textarea')
          .once('tjqAllyClick')
          .addClass('tjq-ally-click')
          .attr('tabindex', 0)
          .attr('role', 'button')
          .on('keydown', (e) => {
            let target = $(e.currentTarget);
            if (e.keyCode === 13 &&  // Enter key pressed
                target.attr('aria-disabled') !== 'true') {
              target.click();
            }
          });

        return this;
      }
      
      /**
       * Element.getAttribute()/setAttribute()
       * @param {string} key 
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
        this.each((elem) => {
          elem.removeAttribute(key);
        });

        return this;
      }

      /**
       * Set/get element property.
       * @param {string} key 
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
       * @returns string
       */
      label(set) {
        if (typeof set === 'string') {
          this.attr('aria-label', set);
          return this;
        }
        
        if (!this.get(0)) return null;

        let get = (test) => test && test.length && test;
        return get(this.attr('aria-label')) || 
               get(get(this.attr('aria-labelledby')) && $('#' + this.attr('aria-labelledby')).label()) || 
               get(get(this.attr('id')) && $('label[for="'+ this.attr('id') + '"]').label()) ||
               get(this.attr('title')) || 
               get(this.attr('alt')) || 
               (this.text() || "").trim();
      }
      
      /**
       * Store/retrieve abitrary data on the element.
       * @param {string|object} key 
       * @param {*} [set] 
       * @returns {this|*}
       */
      data(key, set) {
        if(objectOrProp(key, set, (k, v) => {
          this.each((elem) => {
            elem.tjqData = elem.tjqData || {};
            elem.tjqData[k] = v;
          });
        })) return this;

        return this[0] ? (this[0].tjqData || {})[key] : null;
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
      focus(callback, options) {
        if (typeof callback === 'undefined' && this[0] && typeof this[0].focus === 'function') {
          this[0].focus();
        } else if (typeof callback !== 'undefined') {
          this.on('focus', callback, options);
        }

        return this;
      }
      
      /**
       * Element.focus()
       * @param {function} [callback] 
       * @param {Object} [options] addEventListener options.
       * @returns {this}
       */
      blur(callback, options) {
        if (typeof callback === 'undefined' && this[0] && typeof this[0].blur === 'function') {
          this[0].blur();
        } else if (typeof callback !== 'undefined') {
          this.on('blur', callback, options);
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
       * @param {string|string[]} name 
       * @returns {boolean}
       */
      hasClass(name) {
        name = name instanceof Array ? name : [name];
        return this.some((elem) => name.every((className) => elem.classList.contains(className)));
      }
      
      /**
       * Filter elements that were not called by this function with the given identifier before.
       * @param {*} identifier 
       * @returns {TjQueryCollection}
       */
      once(identifier) {
        identifier = typeof identifier === 'undefined' ? 'once' : identifier;
        let res = this.filter((elem) => {
          let $elem = $(elem);
          let once = $elem.data('tjqOnce') || [];
          if(!once.includes(identifier)) {
            once.push(identifier);
            $elem.data('tjqOnce', once);
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
        return this[index];
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
        return this.slice(0, 1);
      }

      /**
       * Get last element.
       * @returns {TjQueryCollection}
       */
      last() {
        return this.slice(-1);
      }

      /**
       * Get element.
       * @param {number} index
       * @returns {TjQueryCollection}
       */
      eq(index) {
        return this.slice(index, 1);
      }

      /**
       * Element.nextSibling
       * @param {string} [selector]
       * @returns {TjQueryCollection}
       */
      next(selector) {
        return from(propElem(this, 'nextElementSibling', selector));
      }

      /**
       * Element.previousSibling
       * @param {string} [selector]
       * @returns {TjQueryCollection}
       */
      prev(selector) {
        return from(propElem(this, 'previousElementSibling', selector));
      }

      /**
       * Get all sibling elements.
       * @param {string} [selector]
       * @returns {TjQueryCollection}
       */
      siblings(selector) {
        return $(propElem(this, 'previousElementSibling', selector, true)
                  .concat(propElem(this, 'nextElementSibling', selector, true)));
      }
      
      /**
       * Element.children
       * @param {string} [selector]
       * @returns {TjQueryCollection}
       */
      children(selector) {
        return $(propElem(this.map((elem) => elem.firstChild), 'nextElementSibling', selector, true, true));
      }
      
      /**
       * Element.parentNode
       * @param {string} [selector]
       * @returns {TjQueryCollection}
       */
      parent(selector) {
        let res = $(this.map((elem) => elem.parentNode));
        return selector ? res.filter(selector) : res;
      }
      
      /**
       * Element.parentNode recursive, filtered by selector.
       * @param {string} [selector]
       * @returns {TjQueryCollection}
       */
      parents(selector) {
        return $(propElem(this, 'parentNode', selector, true));
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
    function $(selector, c) {
      if (!selector) return new TjQueryCollection();
      if (!c && selector instanceof TjQueryCollection) return selector;
      if (!c && selector === document) return new TjQueryCollection(document);
      
      selector = (typeof selector === 'object' && selector.length) ? from(selector, Array) : selector;
      let selectors = selector instanceof Array ? selector : [selector];
      let context = c ? $(c) : $document;
      let elems = new Set();
    
      for (let sel of selectors) {
        if (sel instanceof TjQueryCollection) {
          if (!c && selectors.length === 1) {
            return sel;
          }
          sel.forEach((elem) => elems.add(elem));
        } else if (sel instanceof Element) {
          if (!c && selectors.length === 1) {
            return new TjQueryCollection(sel);
          }
          elems.add(sel)
        }  else if (sel instanceof NodeList) {
          sel.forEach((elem) => {
            if (elem instanceof Element) {
              elems.add(elem);
            }
          });
        } else if (sel instanceof HTMLCollection) {
          if (!c && selectors.length === 1) {
            return from(sel);
          }
          sel.forEach((elem) => {
            elems.add(elem);
          });
        } else if (typeof sel === 'string') {
          if (!c && selectors.length === 1) {
            return from(document.querySelectorAll(sel));
          }
          context.each((cElem) => {
            cElem.querySelectorAll(sel).forEach((elem) => elems.add(elem));
          });
        }
      }
      elems = from(elems);
    
      // Filter within context
      if (c) {
        elems = elems.filter((elem) => {
          return context.some((cont) => cont !== elem && cont.contains(elem));
        });
      }

      // Sort by apppearance
      if (selectors.length > 1) {
        elems = elems.sort((a, b) => {
          if( a === b) return 0;
          if( a.compareDocumentPosition(b) & 2) {
              // b comes before a
              return 1;
          }
          return -1;
        });
      }

      return elems;
    }

    /**
     * Get element from another element's property recursively, filtered by selector.
     * @param {TjQueryCollection} collection 
     * @param {string} prop 
     * @param {string} [selector] 
     * @param {boolean} [multiple] 
     */
    function propElem(collection, prop, selector, multiple, includeFirst) {
      let res = new Set();
      collection.forEach((elem) => {
        if (!elem) return;
        let found = false;
        let next = elem[prop];
        if (includeFirst) {
          next = elem;
        }
        do {
          if (next instanceof Element && (!selector || next.matches(selector))) {
            res.add(next);
            found = true;
          }
        } while ((!found || multiple) && next && (next = next[prop]))
      });

      return from(res, Array);
    }

    /**
     * Helper function for excuting by name/value or multiple object key/value pairs.
     * @param {string|object} name the string may also be space separated for multi value.
     * @param {*} set 
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
     * @param {object} object 
     * @param {contructor} [Class] defaults to TjQueryCollection
     */
    function from(object, Class) {
      Class = typeof Class === 'undefined' ? TjQueryCollection : Class;
      if (typeof object !== 'object' || !object) return new Class(); 
      if (object.isPrototypeOf(Class)) return object;
      if (object.length) {
        let i;
        let arr = new Class(object.length);
        for (i = 0; i < object.length; i++) {
          arr[i] = object[i];
        }
        return arr;
      }
      return Class.from(object);
    }
  })();
  