# Rickscroll
A high performance scrolling utility for React. Featured in [GitKraken](http://www.gitkraken.com/)

Basic Usage
------
Install with npm: `npm install rickscroll`

```javascript
const Rickscroll = require('rickscroll');

const list = new Array(10000).fill({}).map(() => ({
  contentComponent() { return <span>Hello world!</span>; },
  height: 20
}));

function renderList() {
  return <Rickscroll list={list} />;
}
```

*Example written in ES6*

Features
------
Rickscroll offloads scrolling onto the GPU by using CSS 3d translations. Rickscroll partitions display rows in small groups that are easy for a browser to paint. This module tries to minimize repaints to at most 1 partition at a time during a scroll event. Not only does this work well, it is incredibly fast, and it can support millions of nodes.

Rickscroll does not use an infinite loader. When you scroll, your scrollbar will not scale in response to adding more partitions to the DOM. Rickscroll will never grow the DOM to more than 2 + the number of partitions that would reasonably fit in a given display area.

Rickscroll supports horizontal scrolling. There are other implementations of large, performant scrollers, but none that support decent horizontal scrolling. Rickscroll will horizontally scroll your content component for you but can optionally pass through scroll offsets to your content component, instead. For situations like the graph in GitKraken, it's necessary to have more fine grain control over horizontal scrolling.

Rickscroll provides gutter functionality. Gutters are an option provided by Rickscroll to provide advanced horizontal scrolling. Often when building large display lists, we want to lock static content to the left or right of our main content. Rickscroll addresses this by providing gutters that work with horizontal scrolling and also provides resizable gutter capabilities.

Rickscroll provides scrollTo methods for navigating to any location in Rickscroll through props.

Rickscroll also works well with multi-lists. Multi-lists can specify headers for each list where these headers gain special properties in Rickscroll. Headers are collapsible. Headers are lockable. Headers are stackable. There are methods provided to scrollTo the exact location of a header. No calculations on your part.

Most importantly, Rickscroll will:
  - always gonna scroll you up
  - always gonna scroll you down
  - never gonna run around and desert you
  - never gonna make you cry
  - never gonna say goodbye
  - never gonna tell a lie and hurt you

Public Methods
------
 - scrollToHeader(headerIndex: **integer**): Scrolls to the header at headerIndex.
 - toggleSection(sectionIndex: **integer**): Toggles the visibility of the rows under headerIndex.
 - updateDimensions(): Calling this will internally recalculate the dimensions of rickscroll. Rick scroll is already listening to the window resize event, but if you wrap rickscroll with a resizable container, you may need to call updateDimensions when the resizable container is resized.

PropTypes
------
 - className: **string** *(optional)*
 - guttersConfig: **object** *(optional)*
   - left: **object** *(optional)*
     - className: **string** *(optional)*
     - handleClassName: **string** *(optional)*
     - handleWidth: **number** *(optional)*
     - minWidth: **number** *(optional)*
     - width: **number** *(optional)*
   - right: **object** *(optional)*
     - className: **string** *(optional)*
     - handleClassName: **string** *(optional)*
     - handleWidth: **number** *(optional)*
     - minWidth: **number** *(optional)*
     - width: **number** *(optional)*
 - headerType: **string** *(optional)* - [default: 'default']
 - horizontalScrollConfig: **object** *(optional)*
   - className: **string** *(optional)*
   - contentWidth: **number**
   - passthroughOffsets: **bool** *(optional)* - [default: false]
   - scrollbarHeight: **number** *(optional)* - [default: 15]
 - list \*: **array** of **objects** containing
   - className: **string** *(optional)*
   - contentClassName: **string** *(optional)*
   - contentComponent: **React.Component**
   - gutters: **object** *(optional)*
     - left: **object** *(optional)*
       - className: **string** *(optional)*
       - componentClass: **React.Component**
       - handleClassName: **string** *(optional)*
       - props: **object** *(optional)*
     - right: **object** *(optional)*
       - className: **string** *(optional)*
       - componentClass: **React.Component**
       - handleClassName: **string** *(optional)*
       - props: **object** *(optional)*
   - height: **number**
   - props: **object** *(optional)*
 - lists \*: **array** of **objects** containing
   - headerClassName: **string** *(optional)*
   - headerComponent: **React.Component**
   - headerProps: **object** *(optional)*
   - height: **number**
   - initCollapsed: **boolean** *(optional)*
   - rows: *(see definition of **list** prop type above)*
 - scrollTo: **object** *(optional)*
   - x: **number** *(optional)* - [default: 0]
   - y: **number** *(optional)* - [default: 0]
 - verticalScrollConfig: **object** *(optional)*
   - className: **string** *(optional)*
   - scrollbarWidth: **number** *(optional)* - [default: 15]

\* rickscroll requires only one of list/lists. One must be set and no more than one should be set.

Dependencies
------
Rickscroll is written using es6 via babel. So we ask that you provide `babel-polyfill@^0.6.13`

Rickscroll is written for `react@^0.14.0`

License
------
Copyright (c) 2016 Tyler Wanek

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
