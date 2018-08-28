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
    
    class TjQueryCollection extends Array {
      
      constructor(items) {
        super(...items);
      }

      each (callback) {
        this.forEach(callback);
        return this;
      }
      
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
      
      contains(selector) {
        if (typeof selector === 'string') {
          return !!this.find(selector).length;
        }
        
        let found = false;
        let sel = $(selector);
        this.each((elem) => {
          found = found || sel.contains(elem);
        });

        return found;
      }
      
      is(selector) {
        let all = true;
        if (typeof selector === "string") {
          this.each((elem) => {
            all = all && elem.matches(selector);
          });
        } else {
          let test = $(selector);
          this.each((elem) => {
            all = all && ~test.indexOf(elem);
          });
        }
        return !!all;
      }
      
      not(selector) {
        return $(this.filter((elem) => {
          return !$(elem).is(selector);
        }));
      }
      
      find(selector) {
        let res = [];
        this.each((elem) => {
          res.push(elem.querySelectorAll(selector));
        });
        return $(res);
      }
      
      on(type, callback, options) {
        this.each((elem) => {
          elem.addEventListener(type, callback, options)
        });
        return this;
      };
      
      off(type, callback) {
        this.each((elem) => {
          elem.removeEventListener(type, callback);
        });
        return this;
      }
      
      click(callback) {
        if (!callback) {
          this.each((elem) => {
            elem.click();
          });
          return this;
        }
        this.on('click', callback);
        this.attr('tabindex', 0).addClass('clickable');
        this
          .not('a[href], button')
          .once('tjqAllyClick')
          .on('keydown', () => {
            if (e.which === 13) {// Enter key pressed
              e.currentTarget.click();
            }
          });
      }
      
      attr(key, set) {
        if(typeof set !== 'undefined') {
          this.each((elem) => {
            elem.setAttribute(key, set);
          });
          return this;
        }
        
        return this[0] ? this[0].getAttribute(key) : null;
      }
      
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
      
      focus() {
        if (this[0]) {
          this[0].focus();
        }
        return this;
      }
      
      
      addClass(name) {
        this.toggle(name, true);
        return this;
      }
      
      removeClass(name) {
        this.toggle(name, false);
        return this;
      }
      
      toggle(name, force) {
        this.each((elem) => {
          elem.classList.toggle(name, force);
        });
        return this;
      }

      hasClass(name) {
        let all = true;
        this.each((elem) => {
          all = all && elem.classList.contains(name);
        })
        return all;
      }
      
      once(identifier) {
        identifier = typeof identifier === "undefined" ? "once" : identifier;
        let res = [];
        this.each((elem, index) => {
          let $elem = $(elem);
          let once = $elem.data('once') || [];
          if(!~once.indexOf(identifier)) {
            once.push(identifier);
            res.push(elem);
            $elem.data('once', once);
            
            if(typeof identifier === 'function') {
              identifier.call(elem, index);
            }
          }
        });
        return $(res);
      }

      first() {
        return $(this[0]);
      }

      last() {
        return $(this[this.length-1]);
      }

      next() {
        let res = [];
        this.each((elem) => {
          res.push(elem.nextSibling);
        });
        return $(res);
      }

      prev() {
        let res = [];
        this.each((elem) => {
          res.push(elem.previousSibling);
        });
        return $(res);
      }
      
      children() {
        let res = [];
        this.each((elem) => {
          res.push(elem.childNodes);
        });
        return $(res);
      }
      
      parent() {
        let res = [];
        this.each((elem) => {
          res.push(elem.parentNode);
        })
        return $(res);
      }
      
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
      
      closest(selector) {
        return $(this.parents(selector)[0]);
      }
      
    }
    
    let tjqDocument = new TjQueryCollection([document]);
    return $;
    
    function $(selector, context) {
      if (!selector) return new TjQueryCollection([]);
      if (!context && selector instanceof TjQueryCollection) return selector;
    
      let selectors = (selector instanceof Array) ? selector : [selector];
    
      if (context) {
        if (!(context instanceof TjQueryCollection)) {
          context = $(context)
        }
      } else {
        context = tjqDocument;
      }
    
      let elems = [];
    
      for (let i = 0; i < selectors.length; i++) {
        if (selectors[i] instanceof TjQueryCollection) {
          for (let j in selectors[i]) {
            elems.push(selectors[i][j]);
          }
        } else {
          if (selectors[i] instanceof HTMLElement) {
            elems.push(selectors[i])
          }
        
          if (selectors[i] instanceof NodeList) {
            for (let j = 0; j < selectors[i].length; j++) {
              if (selectors[i][j] instanceof HTMLElement) {
                elems.push(selectors[i][j]);
              }
            }
          }
        
          if (typeof selectors[i] === 'string') {
            context.find(selectors[i]).forEach((elem) => {
              elems.push(elem);
            });
          }
        }
      }
    
      // Filter unique and sort by appearance
      elems = elems.filter((value, index, self) => {
        return self.indexOf(value) === index;
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