// ==UserScript==
// @name           Togetter: 残りを全部読む
// @description    「残りを読む」をクリックしたら残りを全て表示する
// @version        1.1
// @author         vzvu3k6k
// @match          http://togetter.com/li/*
// @grant          none
// @noframes
// @namespace      http://vzvu3k6k.tk/
// @license        CC0
// ==/UserScript==

// js-standard-style (https://github.com/feross/standard)

var pageId = window.location.pathname.match(/\/li\/(\d+)$/)[1]

var buttonToReadRest = document.querySelector('.more_tweet_box a')

var onclick = function (event) {
  if (event.target !== buttonToReadRest) return
  if (event.button !== 0) return
  event.preventDefault()
  event.stopPropagation()
  window.removeEventListener('click', onclick)
  start()
}
window.addEventListener('click', onclick, true)

function start () {
  return loadMore(buttonToReadRest).then(
    wait(1000)
  ).then(function (nextUrl) {
    return recNext(nextUrl)

    function recNext (nextUrl) {
      if (nextUrl) {
        return wait(1000)(nextUrl)
          .then(loadNext)
          .then(recNext)
      } else {
        return Promise.resolve()
      }
    }
  }).catch(function (err) {
    console.error(err)
  })
}

function loadMore (button) {
  var onclick = button.getAttribute('onclick')

  var match = onclick.match(/tgtr\.moreTweets\(\d+,(\d+),''\)/)
  if (match) {
    var currentPageNum = +match[1]
  } else {
    return Promise.reject(new Error('Failed to parse onclick attribute ("' + onclick + '")'))
  }

  return apiMoreTweets(currentPageNum).then(function (html) {
    // based on `tgtr.moreTweets`
    window.$('#more_tweet_box_' + pageId).replaceWith(html)
  }).then(afterLoad)
}

function afterLoad () {
  // based on `tgtr.moreTweets`
  window.emojiParser()
  window.$.lazy()
  window.twttr.widgets.load()

  var nextLink = document.querySelector('.tweet_box .pagenation a:last-child')
  var nextUrl
  if (nextLink && nextLink.textContent === '次へ') {
    nextUrl = nextLink.href
  } else {
    nextUrl = null
  }

  document.querySelector('.tweet_box .pagenation').remove()

  return nextUrl
}

function loadNext (nextUrl) {
  return xhr(nextUrl).then(function (xhrEvent) {
    var newDocument = xhrEvent.target.responseXML
    appendNewPage(newDocument, nextUrl)
  }).then(afterLoad)
}

function getPageNum (url) {
  var match = url.search.match(/(?:&|\?)page=(\d+)/)
  if (match) {
    return +match[1]
  } else {
    return 1
  }
}

function apiMoreTweets (currentPageNum) {
  return new Promise(function (resolve) {
    window.call_api_ex(
      '/api/moreTweets/' + pageId,
      {page: currentPageNum, key: ''},
      function (html) {
        resolve(html)
      }
    )
  })
}

function wait (delay) {
  return function (value) {
    return new Promise(function (resolve) {
      setTimeout(function () {resolve(value)}, delay)
    })
  }
}

function appendNewPage (newDocument, url) {
  var hr = document.createElement('hr')
  hr.setAttribute('class', 'togetter-more_pagination_page_separator')
  var p = document.createElement('p')
  p.textContent = 'page: '
  var a = document.createElement('a')
  a.setAttribute('class', 'togetter-more_pagination_page_info')
  a.setAttribute('href', url)
  a.textContent = getPageNum(new window.URL(url))
  p.appendChild(a)

  var newTweetBoxChildren = Array.prototype.slice.call(
    newDocument.querySelector('.tweet_box').children, 0)
  var nodes = [hr, p].concat(newTweetBoxChildren)

  var box = document.querySelector('.tweet_box')
  nodes.forEach(function (node) {
    box.appendChild(node)
  })
}

function xhr (url) {
  return new Promise(function (resolve) {
    var xhr = new window.XMLHttpRequest()
    xhr.open('GET', url)
    xhr.responseType = 'document'
    xhr.addEventListener('load', function (xhrEvent) {
      resolve(xhrEvent)
    })
    xhr.send(null)
  })
}
