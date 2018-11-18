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
        return Array.from(this).map(callback, this);
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
        return $(Array.from(this).concat($(selector, context)));
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
       * !Element.matches() 
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
       * Filter elements that match selector. 
       * @param {*} selector
       * @returns {TjQueryCollection}
       */
      filter(selector) {
        if (typeof selector === 'function') {
          return TjQueryCollection.from(Array.from(this).filter(selector, this));
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
          return $(Array.from(this).find(selector, this));
        } else if (typeof selector === 'string') {
          return $(this.map((elem) => elem.querySelectorAll(selector)));
        }
        return $(selector, this);
      }
      
      /**
       * Element.addEventListener()
       * @param {string} type 
       * @param {function} callback 
       * @param {Object} [options] addEventListener options.
       * @returns {this}
       */
      on(type, callback, options) {
        let events = type.split(' ');
        return this.each((elem) => {
          events.forEach((ev) => {
            elem.addEventListener(ev, callback, options);
          });
        });
      };
      
      /**
       * Element.removeEventListener()
       * @param {string} type 
       * @param {function} callback 
       * @returns {this}
       */
      off(type, callback) {
        let events = type.split(' ');
        return this.each((elem) => {
          events.forEach((ev) => {
            elem.removeEventListener(ev, callback);
          });
        });
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
        if(typeof set !== 'undefined') {
          this.each((elem) => {
            elem.setAttribute(key, set);
          });
          return this;
        }
        
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
        if (typeof set !== 'undefined') {
          this.each((elem) => {
            elem[key] = set;
          });
          return this;
        }

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
       * Store/retrieve abitrary data on the element.
       * @param {string} key 
       * @param {*} [set] 
       * @returns {this|*}
       */
      data(key, set) {
        if(typeof set !== 'undefined') {
          this.each((elem) => {
            elem.tjqData = elem.tjqData || {};
            elem.tjqData[key] = set;
          });
          return this;
        }

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
       * @returns {this}
       */
      focus() {
        if (this[0] && this[0].focus) {
          this[0].focus();
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
       * @param {string} name 
       * @param {string} [force] 
       * @returns {this}
       */
      toggleClass(name, force) {
        return this.each((elem) => elem.classList.toggle(name, force));
      }

      /**
       * Element.classList.contains()
       * @param {string} name 
       * @returns {boolean}
       */
      hasClass(name) {
        return this.some((elem) => elem.classList.contains(name));
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
       * Element.nextSibling
       * @param {string} [selector]
       * @returns {TjQueryCollection}
       */
      next(selector) {
        return $(propElem(this, 'nextSibling', selector || "*"));
      }

      /**
       * Element.previousSibling
       * @param {string} [selector]
       * @returns {TjQueryCollection}
       */
      prev(selector) {
        return $(propElem(this, 'previousSibling', selector || "*"));
      }

      /**
       * Get all sibling elements.
       * @param {string} [selector]
       * @returns {TjQueryCollection}
       */
      siblings(selector) {
        return $(propElem(this, 'previousSibling', selector, true)
                  .concat(propElem(this, 'nextSibling', selector, true)));
      }
      
      /**
       * Element.children
       * @param {string} [selector]
       * @returns {TjQueryCollection}
       */
      children(selector) {
        let res = $(this.map((elem) => elem.children));
        return selector ? res.filter(selector) : res;
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
    
      let selectors = (selector instanceof Array) ? selector : [selector];
      let context = c ? $(c) : $document;
      let elems = new Set();
    
      for (let sel of selectors) {
        if (sel instanceof TjQueryCollection) {
          sel.forEach((elem) => elems.add(elem));
        } else if (sel instanceof Element) {
          elems.add(sel)
        }  else if (sel instanceof NodeList) {
          sel.forEach((elem) => {
            if (elem instanceof Element) {
              elems.add(elem);
            }
          });
        } else if (sel instanceof HTMLCollection) {
          if (!c && selectors.length === 1) {
            return TjQueryCollection.from(sel);
          }
          Array.from(sel).forEach((elem) => {
            elems.add(elem);
          });
        } else if (typeof sel === 'string') {
          if (!c && selectors.length === 1) {
            return TjQueryCollection.from(document.querySelectorAll(sel));
          }
          context.find(selector).forEach((elem) => elems.add(elem));
        }
      }

      elems = TjQueryCollection.from(elems);
    
      // Filter unique, within context, and sort by appearance
      if (c) {
        elems = elems.filter((elem) => {
          return context.some((cont) => cont.contains(elem));
        });
      }

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
    function propElem(collection, prop, selector, multiple) {
      let res = [];
      collection.each((elem) => {
        let found = false;
        let next = elem;
        while ((!found || multiple) && (next = next[prop])) {
          if (next instanceof Element && (!selector || next.matches(selector))) {
            res.push(next);
            found = true;
          }
        }
      });

      return res;
    }
  })();