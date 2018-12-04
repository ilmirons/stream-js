// a stramBuilder with memoization used as an exercise for ECMA 6

// TODO let/var/const in place
// TODO use arrow function/lean syntax wherever possible
// TODO limited reduce (consume n)

// TODO refactor next function, should operate on stream, not values
// TODO turn streamBuilder into a class Stream

// Enhancements

// TODO limit memoization to last n
// TODO make it work with thenables as value holders
// TODO link previous memoized

var streamBuilder = (value, next, memoize = true) => {

  var actual = {};

  Object.defineProperty(actual, '_memoize', {
    enumerable: false,
    writable: false,
    value: memoize
  })

  // memoize next value in actual
  if (actual._memoize) {
    Object.defineProperty(actual, '_next', {
      enumerable: false,
      writable: true,
      value: undefined
    })
    Object.defineProperty(actual, '_getMemoize', {
      enumerable: false,
      writable: false,
      value: (function () {
        return (typeof this._next !== 'undefined' ? 
          this._next 
          : (this._next = streamBuilder(next(this.head), next, memoize)),
          this._next) 
      }).bind(actual)
    })
  }

  actual.head = value

  // Note this needs to be a function, not an arrow, according to binding rule
  actual.tail = (function(memoize = this._memoize) {
    return (memoize ? 
      this._getMemoize() :
      streamBuilder(next(this.head), next, memoize))
  }).bind(actual)

  actual.filter = (function(p) {
    var src = actual
    let _nextF = function () {
      let result
      while (!p(src.head)) {
        src = src.tail
      }
      result = src.head
      src = src.tail
      return result
    }
    return streamBuilder(_nextF(), _nextF, this._memoize)
  }).bind(actual)

  actual.map = (function(f) {
    var src = actual
    let _nextF = function () {
      let result = f(src.tail.head)
      src = src.tail
      return result
    }
    return streamBuilder(_nextF(), _nextF, this._memoize)
  }).bind(actual)

  // add array-Like getter, make immutable, avoid parentheses to get tail
  return new Proxy(actual, {
    get(target, key, proxy) {
      switch (true) {
        case (key in target):
          return key === 'tail' ? 
            Reflect.get(target, key)(this._memoize)
            : Reflect.get(...arguments) 
        default:
          var act = proxy
          var key = parseInt(key, 10) // note parseInt never throws, but returns NaN
          if (Number.isInteger(key) && key >= 0) {
            while (key--) {
              // note we are flatMapping via Reflect.get
              act = Reflect.get(act, 'tail')(this._memoize)
            }
            return act
          } else {
            return undefined
          }
      }
    },
    set(target, key, value) {
      if (!(key in target) || Reflect.get(target, key) !== undefined)
        throw new Error('Stream is immutable')
      else
        return Reflect.set(...arguments)
    }
  })
}