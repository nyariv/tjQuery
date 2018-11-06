  /**
   * Tiny jQuery
   * ES6 based, stripped down jQuery to the most used bits, with all dom manipulation removed.
   *
   * Usage:
   * (($) => {
   *   $('ul > li').addClass('show').click((e) => { $(this).toggle('show'); });
   * })(tjQuery)
   */

  const tjQuery = (() => {
    "use strict";

    class TjQueryCollection extends Array {
      
      /**
       * 
       * @param {HTMLElement[]} items 
       */
      constructor(items) {
        super(...items);
      }

      /**
       * Loop through elements, return false on stop.
       * @param {function} callback 
       * @returns {this}
       */
      each (callback) {
        let index = 0;
        for (let elem of this) {
          if (callback.call(this, elem, index++, this) === false) {
            break;
          }
        }
        return this;
      }
      
      /**
       * Array.filter()
       * @param {function} callback 
       * @returns {Array}
       */
      filter(callback) {
        let res = [];
        let index = 0;
        let self = this;
        this.each((elem) => {
          if(callback(elem, index++, self)) {
            res.push(elem);
          }
        });
        return res;
      }
      
      /**
       * HTMLElement.contains() 
       * @param {*} selector
       * @returns {boolean}
       */
      contains(selector) {
        if (typeof selector === 'string') {
          return !!this.find(selector).length;
        }
        
        let found = false;
        let sel = $(selector);
        this.each((elem) => {
          sel.each(function(test) {
            return !(found = found || elem.contains(test));
          });
          if (found) {
            return false;
          }
        });

        return found;
      }
      
      /**
       * HTMLElement.matches() 
       * @param {*} selector
       * @returns {boolean}
       */
      is(selector) {
        let all = true;
        if (typeof selector === "string") {
          this.each((elem) => {
            return all = all && elem.matches(selector);
          });
        } else {
          let test = $(selector);
          this.each((elem) => {
            return all = all && test.includes(elem);
          });
        }
        return all;
      }
      
      /**
       * Filter elements that do not match selector 
       * @param {*} selector
       * @returns {TjQueryCollection}
       */
      not(selector) {
        let sel = selector;
        if (typeof selector !== 'string') {
          sel = $(selector)
        }
        return $(this.filter((elem) => {
          return !$(elem).is(sel);
        }));
      }
      
      /**
       * HTMLElement.querySeletorAll()
       * @param {string} selector
       * @returns {TjQueryCollection}
       */
      find(selector) {
        let res = [];
        this.each((elem) => {
          res.push(elem.querySelectorAll(selector));
        });
        return $(res);
      }
      
      /**
       * HTMLElement.addEventListener()
       * @param {string} type 
       * @param {function} callback 
       * @param {object} options 
       * @returns {this}
       */
      on(type, callback, options) {
        let events = type.split(' ');
        this.each((elem) => {
          events.forEach(function (ev) {
            elem.addEventListener(ev, callback, options)
          });
        });
        return this;
      };
      
      /**
       * HTMLElement.removeEventListener()
       * @param {string} type 
       * @param {function} callback 
       * @returns {this}
       */
      off(type, callback) {
        let events = type.split(' ');
        this.each((elem) => {
          events.forEach(function (ev) {
            elem.removeEventListener(type, callback);
          });
        });
        return this;
      }
      
      /**
       * .on('click') alias. Adds accesibility support.
       * @param {function} callback 
       * @returns {this}
       */
      click(callback) {
        if (!callback) {
          this.each((elem) => {
            elem.click();
          });
          return this;
        }
        this.on('click', callback);
        this
          .addClass('tjq-click')
          .not('a[href], button, input, select, textarea')
          .once('tjqAllyClick')
          .attr('tabindex', 0)
          .attr('role', 'button')
          .on('keydown', (e) => {
            if (e.keyCode === 13) { // Enter key pressed
              e.currentTarget.click();
            }
          });
        return this;
      }
      
      /**
       * HTMLElement.getAttribute()/setAttribute()
       * @param {string} key 
       * @param {string|number} set 
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
       * HTMLElement.removeAttribute()
       * @param {string} key 
       */
      removeAttr(key) {
        this.each((elem) => {
          elem.removeAttribute(key);
        });

        return this;
      }
      
      /**
       * HTMLElement.value
       * @param {string|number|boolean} set 
       * @returns {this|string}
       */
      val(set) {
        if(typeof set !== 'undefined') {
          this.each((elem) => {
            if (elem.getAttribute('type') === 'checkbox') {
              elem.value = !!set;
            } else {
              elem.value = set;
            }
          });
          return this;
        }
        return this[0] ? this[0].value : null;
      }

      /**
       * HTMLElement.textContent
       * @param {string} set 
       */
      text(set) {
        if (typeof set !== 'undefined') {
          this.each((elem) => {
            elem.textContent = set;
          });
          return this;
        }

        return this[0] ? this[0].textContent : null;
      }
      
      /**
       * Store/retrieve abitrary data on the element.
       * @param {string} key 
       * @param {*} set 
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
       * HTMLElement.focus()
       * @returns {this}
       */
      focus() {
        if (this[0]) {
          this[0].focus();
        }
        return this;
      }
      
      /**
       * HTMLElement.classList.add()
       * @param {string} name 
       * @returns {this}
       */
      addClass(name) {
        this.toggle(name, true);
        return this;
      }
      
      /**
       * HTMLElement.classList.remove()
       * @param {string} name 
       * @returns {this}
       */
      removeClass(name) {
        this.toggle(name, false);
        return this;
      }
      
      /**
       * HTMLElement.classList.toggle()
       * @param {string} name 
       * @returns {this}
       */
      toggle(name, force) {
        this.each((elem) => {
          elem.classList.toggle(name, force);
        });
        return this;
      }

      /**
       * HTMLElement.classList.contains()
       * @param {string} name 
       * @returns {boolean}
       */
      hasClass(name) {
        let all = true;
        this.each((elem) => {
          all = all && elem.classList.contains(name);
        })
        return all;
      }
      
      /**
       * Filter elements that were not called by this function with the given identifier before.
       * @param {*} identifier 
       * @returns {TjQueryCollection}
       */
      once(identifier) {
        identifier = typeof identifier === "undefined" ? "once" : identifier;
        let res = [];
        this.each((elem, index) => {
          let $elem = $(elem);
          let once = $elem.data('tjqOnce') || [];
          if(!once.includes(identifier)) {
            once.push(identifier);
            res.push(elem);
            $elem.data('tjqOnce', once);
            
            if(typeof identifier === 'function') {
              identifier.call(elem, index);
            }
          }
        });
        return $(res);
      }

      /**
       * Get first element.
       * @returns {TjQueryCollection}
       */
      first() {
        return $(this[0]);
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
       * @param {string} selector
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
        return $(this.parents(selector)[0]);
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
    
      let selectors = (selector instanceof Array) ? selector : [selector];
      let context = $document;
      if (c) {
        if (!(c instanceof TjQueryCollection)) {
          context = $(c)
        } else {
          context = c;
        }
      }
    
      let elems = [];
    
      for (let i = 0; i < selectors.length; i++) {
        if (selectors[i] instanceof TjQueryCollection) {
          for (let j in selectors[i]) {
            elems.push(selectors[i][j]);
          }
        } else if (selectors[i] instanceof HTMLElement) {
          elems.push(selectors[i])
        }  else if (selectors[i] instanceof NodeList) {
          for (let j = 0; j < selectors[i].length; j++) {
            if (selectors[i][j] instanceof HTMLElement) {
              elems.push(selectors[i][j]);
            }
          }
        } else if (typeof selectors[i] === 'string') {
          context.find(selectors[i]).each((elem) => {
            elems.push(elem);
          });
        }
      }
    
      // Filter unique and sort by appearance
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