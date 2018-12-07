# Tiny jQuery
Tiny jQuery is an ES6 based, stripped down jQuery to the most used bits, with all CSS / DOM manipulation, and general utilities, removed.

## The Problem
- jQuery is 30kb in size and includes many features not needed on every project.
- Most of the features have been included into native JS with pretty good cross browser compatibility.
- The plugin system is redundant as it is now easy for libraries to be coded natively, and only caused jQuery version compatibility nightmares.
- Direct DOM manipulation is considered bad practice as it easily introduces XSS vulerabilities and should be handled by proper templating frameworks like React or Angular.
- Manipulating CSS properties with inline styles is considered bad practice because it overrides theme styles, is hard to update and debug, and should be managed in single place which is your project's stylesheets.

## The Benefits of jQuery
- Traversing the dom is easier to code and read
- Performing bulk operations on multiple elements at once with a single line
- Dot chaining

## The Solution
Tiny jQuery (**tjQuery**) is 4kb in size (gzipped), x4 times faster, and was made to take out all the bad / unneeded bits from jQuery, and keep DOM traversal, event handling, and attribute manipulation. The result is pure syntactic sugar, which is what we love about jQuery to begin with.

Additionally, [jQuery Once](https://github.com/RobLoach/jquery-once) functionality is included, and the `.click()` method has been modified to turn the element accessibility friendly by adding `tabindex`, aria `role`, and keyboard `enter` behavior.

## Supported methods
- All of `Array()`'s methods
- All of `jQuery()`'s event alias methods (`.keyup()`, `.mousemove()`, etc)
- `.map()`
- `.toArray()`
- `.each()`
- `.add()`
- `.is()`
- `.not()`
- `.has()`
- `.filter()`
- `.find()`
- `.on()`
- `.off()`
- `.trigger()`
- `.one()`
- `.click()`
- `.ready()`
- `.hover()`
- `.attr()`
- `.removeAttr()`
- `.prop()`
- `.val()`
- `.text()`
- `.scrollTop()`
- `.scrollLeft()`
- `.label()`
- `.data()`
- `.removeData()`
- `.addClass()`
- `.removeClass()`
- `.toggleClass()`
- `.hasClass()`
- `.get()`
- `.index()`
- `.first()`
- `.last()`
- `.eq()`
- `.next()`
- `.nextUntil()`
- `.nextAll()`
- `.prev()`
- `.prevUntil()`
- `.prevAll()`
- `.siblings()`
- `.children()`
- `.parent()`
- `.parents()`
- `.closest()`

# Extra methods
- `.unique()`
- `.toSet()`
- `.label()`
- `.once()`