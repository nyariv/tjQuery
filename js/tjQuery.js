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
        return $(this[this.length-1]);
      }

      /**
       * HTMLElement.nextSibling
       * @returns {TjQueryCollection}
       */
      next() {
        let res = [];
        this.each((elem) => {
          res.push(elem.nextSibling);
        });
        return $(res);
      }

      /**
       * HTMLElement.previousSibling
       * @returns {TjQueryCollection}
       */
      prev() {
        let res = [];
        this.each((elem) => {
          res.push(elem.previousSibling);
        });
        return $(res);
      }
      
      /**
       * HTMLElement.children
       * @returns {TjQueryCollection}
       */
      children() {
        let res = [];
        this.each((elem) => {
          res.push(elem.children);
        });
        return $(res);
      }
      
      /**
       * HTMLElement.parentNode
       * @returns {TjQueryCollection}
       */
      parent() {
        let res = [];
        this.each((elem) => {
          res.push(elem.parentNode);
        })
        return $(res);
      }
      
      /**
       * HTMLElement.parentNode recursive, filtered by selector.
       * @param {string} [selector]
       * @returns {TjQueryCollection}
       */
      parents(selector) {
        let res = [];
        this.each((elem) => {
          let found = elem;
          while(found = found.parentNode) {
            if (!selector || found.matches(selector)) {
              res.push(found);
            }
          }
        });
        return $(res);
      }
      
      /**
       * HTMLElement.parentNode recursive, limit to one that matches selector.
       * @param {string} selector
       * @returns {TjQueryCollection}
       */
      closest(selector) {
        return this.parents(selector).first();
      }
      
    }
    
    let $document = new TjQueryCollection([document]);
    return $;
    
    /**
     * Query function to get elements
     * @param {*} selector 
     * @param {*} context 
     * @returns {TjQueryCollection}
     */
    function $(selector, c) {
      if (!selector) return new TjQueryCollection([]);
      if (!c && selector instanceof TjQueryCollection) return selector;
      if (!c && selector === document) return new TjQueryCollection([document]);
    
      let selectors = (selector instanceof Array) ? selector : [selector];
      let context = $document;
      if (c) {
        if (c instanceof TjQueryCollection) {
          context = c;
        } else {
          context = $(c)
        }
      }
    
      let elems = [];
    
      for (let sel of selectors) {
        if (sel instanceof TjQueryCollection) {
          elems = elems.concat(sel);
        } else if (sel instanceof HTMLElement) {
          elems.push(sel)
        }  else if (sel instanceof NodeList) {
          for (let elem of Array.from(sel)) {
            if (elem instanceof HTMLElement) {
              elems.push(elem);
            }
          }
        } else if (typeof sel === 'string') {
          elems = elems.concat(context.find(sel));
        }
      }
    
      // Filter unique, within context, and sort by appearance
      elems = elems.filter((value, index, self) => {
        return self.indexOf(value) === index && (!c || context.contains(value));
      }).sort((a, b) => {
        if( a === b) return 0;
        if( a.compareDocumentPosition(b) & 2) {
            // b comes before a
            return 1;
        }
        return -1;
      });
    
      return new TjQueryCollection(elems);
    }
  })();