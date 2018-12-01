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
        let res = new TjQueryCollection(this.length);
        for(let i = 0; i < this.length; i++) {
          res[i] = callback(i, this[i]);
        }
        return res;
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
          cont = callback.call(this[i], i ,this[i]) !== false;
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
        return $([this, $(selector, context)]);
      }
      
      /**
       * Element.matches() 
       * @param {*} selector
       * @returns {boolean}
       */
      is(selector) {
        if (typeof selector === 'string') {
          selector = select(selector, $document);
          if (typeof selector === 'string') {
            return this.some((elem) => elem.matches(selector));
          }
        }

        let sel = (selector instanceof TjQueryCollection ? selector : $(selector)).toSet();
        return this.some((elem) => sel.has(elem));
      }
      
      /**
       * Filter by !Element.matches().
       * @param {*} selector
       * @returns {TjQueryCollection}
       */
      not(selector) {
        if (typeof selector === 'string') {
          selector = select(selector, this, true);
          if (typeof selector === 'string') {
            return this.filter((i, elem) => !elem.matches(selector));
          }
        }
        let sel = (selector instanceof TjQueryCollection ? selector : $(selector)).toSet();
        return this.filter((i, elem) => !sel.has(elem));
      }
      
      /**
       * Filter by Element.contains().
       * @param {*} selector
       * @returns {TjQueryCollection}
       */
      has(selector) {
        if (typeof selector === 'string') {
          if (!selector.length) return this;
          selector = select(selector, this);
          if (typeof selector === 'string') {
            return this.filter((i, elem) => elem.querySelector(':scope ' + selector));
          }
        }
        let sel = selector instanceof TjQueryCollection ? selector : $(selector);
        return this.filter((i, elem) => sel.some((test) => elem !== test && elem.contains(test)));
      }

      /**
       * Filter elements that match selector, or Array.filter() if selector is a function.
       * @param {*} selector
       * @returns {TjQueryCollection}
       */
      filter(selector) {
        if (typeof selector === 'function') {
          let res = [];
          let total = 0;
          for (let i = 0; i < this.length; i++) {
            if (selector(i, this[i])) {
              res[total++] = this[i];
            }
          }
          res.length = total;
          return from(res);
          return super.filter((elem, i) => selector(i, this[i]));
        }
        if (typeof selector === 'string') {
          if (!selector.length) return this;
          selector = select(selector, this, true);
          if (typeof selector === 'string') {
            return this.filter((i, elem) => elem.matches(selector));
          }
        }
        let sel = (selector instanceof TjQueryCollection ? selector : $(selector)).toSet();
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
        return $(selector, this);
      }
      
      /**
       * Element.addEventListener()
       * @param {string} events 
       * @param {string} [selector] delegate selector 
       * @param {string} [data] 
       * @param {function} [callback] 
       * @param {Object} [options] addEventListener options. If 'true' is provided, then jquery-like .once() is assumed.
       * @returns {this}
       */
      on(events, selector, data, callback, options) {
        let params = parseOnParams(events, selector, data, callback, options);

        objectOrProp(params.events, params.callback, (namespace, originalCallback) => {
          originalCallback = originalCallback === false ? () => false : originalCallback;
          let namespaces = namespace.split(".");
          let ev = namespaces.shift();

          let wrapper = (e, container) => {
            let elem = e.currentTarget;
            if(params.selector) {
              elem = e.target.closest(params.selector);
              if (elem === e.currentTarget) {
                elem = null;
              }
            }
            if (!elem || !e.currentTarget.contains(elem)) return;

            let stopImmediate = false;
            let event = new Event(e.type, e);

            for (let prop in e) {
              if (typeof e[prop] === 'function') {
                event[prop] = () => {
                  switch (prop) {
                    case 'stopImmediatePropagation':
                      stopImmediate = true;
                      break;
                  }
                  return e[prop](...arguments)
                };
              } else if (typeof event[prop] === 'undefined') {
                event[prop] = e[prop];
              }
            }
            event.originalEvent = e;
            if (container && container.options === true) {
              container.deleteSelf();
            }
            if (originalCallback.call(elem, event) === false) {
              e.stopPropagation();
              e.preventDefault();
            }
            return stopImmediate;
          }

          this.each((index, elem) => {
            let eventsStore = getStore(elem, 'events', new Map());

            let eventContainer = eventsStore.get(ev);
            if (!eventContainer) {
              eventContainer = {
                isMasterSet: false,
                master: (e) => {
                  let stop = false;
                  eventContainer.allHandlers.forEach((container) => {
                    if (!stop && (typeof container.options === 'undefined' || container.options === true)) {
                      stop = container.handler(e, container);
                    }
                  });
                },
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
              elem: elem,
              options: params.options,
              namespaces: namespaces,
              handler: wrapper,
              originalHandler: originalCallback,
              deleteSelf: () => {
                handlers.delete(container);
                eventContainer.allHandlers.delete(container);
                if (!sel.size) {
                  eventContainer.selectors.delte(params.selector);
                }
              },
            };

            handlers.add(container);
            eventContainer.allHandlers.add(container);

            if (params.options && params.options !== true) {
              elem.addEventListener(ev, wrapper, opt);
            } else if (!eventContainer.isMasterSet) {
              eventContainer.isMasterSet = true;
              elem.addEventListener(ev, eventContainer.master);
            }
          });
        });

        return this;
      };
      
      /**
       * Element.removeEventListener()
       * @param {string} [events] 
       * @param {string} [selector] 
       * @param {function} [callback] 
       * @returns {this}
       */
      off(events, selector, callback) {
        let params = parseOnParams(events, selector, callback);

        let off = (elem, ev, eventStore, namespaces, eventContainer, selectors, handlers) => {
          if (handlers.size) {
            handlers.forEach((container) => {
              if (namespaces.every((ns) => container.namespaces.includes(ns))) {
                if (container.options && container.options !== true) {
                  elem.removeEventListener(ev, container.handler);
                }
                container.deleteSelf();
              }
            });
            if(eventContainer.isMasterSet) {
              let allStandard = true;
              handlers.forEach((container) => allStandard = allStandard && container.options && container.options !== true);
              if (allStandard) {
                eventContainer.isMasterSet = false;
                elem.removeEventListener(ev, eventContainer.master);
              }
            }
            if (!handlers.size) {
              selectors.delete(params.selector);
              if (!selectors.size) {
                eventStore.delete(ev);
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
            off(elem, ev, eventStore, namespaces, eventContainer, selectors, handlers);
          });
        }) && (!events || typeof events === 'string')) {
          let namespaces = (events || "").split(".");
          let event = namespaces.shift();
          this.each((index, elem) => {
            let eventStore = getStore(elem, 'events', new Map());
            eventStore.forEach((eventContainer, ev) => {
              if (!events || ev === event) {
                let selectors = eventContainer.selectors || new Map();
                (selectors.get(params.selector) || new Map()).forEach((handlers) => {
                  off(elem, ev, eventStore, namespaces, eventContainer, selectors, handlers);
                });
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
        extraParams = extraParams || {};
        let params = Object.assign({bubbles: true, cancelable: true}, extraParams);
        let event = new Event(eventType, params);
        this.each((index, elem) => {
          elem.dispatchEvent(event);
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
        return this.on(...Object.values(params).filter((param) => param || param === 0 || param === false));
      };
      
      /**
       * .on('click') alias. Adds accesibility support.
       * @param {function} callback 
       * @param {Object} [options] addEventListener options.
       * @returns {this}
       */
      click(data, callback, options) {
        if (!arguments.length) {
          this.each((index, elem) => {
            elem.click();
          });
          return this;
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
        let ind = 0;
        if (typeof selector === 'undefined') {
          return this.first().prevAll().length;
        } else if (typeof selector === 'string') {
          selector = select(selector, this);
          if (typeof selector === 'string') {
            this.each((elem) => !(elem.matches(selector) || (ind++ || false)));
            return ind >= this.length ? -1 : ind;
          }
        }

        let sel = (selector instanceof TjQueryCollection ? selector : $(selector)).toSet();
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
        return elem  ? new TjQueryCollection(elem) : new TjQueryCollection();
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
        return from(propElem(this.map((i, elem) => elem.firstChild), 'nextElementSibling', selector, true, true));
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
        return $(this.map((i, elem) => elem.closest(selector)));
      }
      
    }
    
    let $document = new TjQueryCollection(document);
    let $html = new TjQueryCollection(document.querySelector('html'));
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
      let $context = context ? (context instanceof TjQueryCollection ? context : $(context)) : $document;
      let elems = new Set();
      let skipFilter = false;
    
      for (let sel of selectors) {
        if (sel instanceof TjQueryCollection) {
          if (!context && selectors.length === 1) {
            return sel;
          }
          sel.each((i, elem) => elems.add(elem));
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
          from(sel).each((elem) => {
            elems.add(elem);
          });
        } else if (typeof sel === 'string') {
          sel = select(sel, $context);
          if (typeof sel === 'string') {
            if (!context && selectors.length === 1) {
              return from(document.querySelectorAll(sel));
            }
            $context.each((i, cElem) => {
              cElem.querySelectorAll(':scope ' + sel).forEach((elem) => elems.add(elem));
            });
            if (selectors.length === 1) {
              skipFilter = true;
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
          from(sel).each((i, elem) => {
            if(elem instanceof Element) {
              elems.add(elem);
            }
          })
        }
      }
      elems = from(elems);
    
      // Filter within context
      if (context && !skipFilter) {
        elems = elems.filter((i, elem) => {
          return $context.some((cont) => cont !== elem && cont.contains(elem));
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
          if (next instanceof Element && (!selector || next.matches(selector))) {
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

    /**
     * Placeholder function for adding custom selectors.
     * @param {*} selector 
     * @param {*} context 
     */
    function select(selector, context) {
      return selector;
    }

  })();
