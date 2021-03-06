const { AnimationTimer } = require('animation-timer');
const classnames = require('classnames');
const constants = require('./constants');
const { Easer } = require('functional-easing');
const { Point } = require('./models');
const React = require('react');
const Row = require('./Row');
const utils = require('./utils');
const _ = require('lodash');

const { PropTypes: types } = React;
const easer = new Easer()
  .using('out-cubic');

class Scrollable extends React.Component {
  constructor(props) {
    super(props);
    [
      '_applyScrollChange',
      '_getContentWidth',
      '_getThrottledAnimationFrameFn',
      '_onHorizontalScroll',
      '_onResize',
      '_onMouseWheel',
      '_onVerticalScroll',
      '_renderContents',
      '_renderCorner',
      '_renderHorizontalScrollbar',
      '_renderHeader',
      '_renderVerticalScrollbar',
      '_scrollTo',
      '_shouldRenderScrollbars',
      '_startResize',
      '_stopResize',
      '_updateDimensions',
      'scrollToHeader',
      'toggleSection',
      'updateDimensions'
    ].forEach(method => { this[method] = this[method].bind(this); });
    this._onThrottledMouseWheel = _.throttle(this._applyScrollChange, constants.ANIMATION_FPS_120, { trailing: true });

    const {
      headerType = constants.headerType.DEFAULT,
      list,
      lists
    } = props;
    const stackingHeaders = headerType === constants.headerType.STACKING;
    const listContainer = list || lists;
    const offset = 6;
    const {
      avgRowHeight,
      collapsedSections,
      contentHeight,
      headers,
      partitions,
      rows
    } = utils.buildRowConfig(listContainer, offset, stackingHeaders);

    this.state = {
      animation: null,
      avgRowHeight,
      buffers: {
        display: 60,
        offset
      },
      collapsedSections,
      contentHeight,
      headers,
      horizontalTransform: 0,
      partitions,
      resize: {
        baseWidth: 0,
        currentPosition: 0,
        performing: false,
        side: '',
        startingPosition: 0
      },
      rows,
      scrollingToPosition: new Point(0, 0),
      shouldRender: {
        horizontalScrollbar: false,
        verticalScrollbar: false
      },
      topPartitionIndex: 0,
      verticalTransform: 0,
      window: {
        height: 0,
        width: 0
      }
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.updateDimensions);
    this._updateDimensions(this.props);
  }

  componentWillReceiveProps({
    headerType = constants.headerType.DEFAULT,
    list: nextList,
    lists: nextLists,
    parentHeight: nextParentHeight,
    parentWidth: nextParentWidth,
    scrollTo: nextScrollTo = {}
  }) {
    const {
      props: {
        list: prevList,
        lists: prevLists,
        parentHeight: prevParentHeight,
        parentWidth: prevParentWidth,
        scrollTo: prevScrollTo = {}
      },
      state: { buffers, collapsedSections: oldCollapsedSections }
    } = this;

    if (prevParentHeight !== nextParentHeight || prevParentWidth !== nextParentWidth) {
      this.updateDimensions();
    }

    const stackingHeaders = headerType === constants.headerType.STACKING;
    const prevListContainer = prevList || prevLists;
    const nextListContainer = nextList || nextLists;

    if (prevListContainer !== nextListContainer || !_.isEqual(prevListContainer, nextListContainer)) {
      const {
        avgRowHeight,
        collapsedSections,
        contentHeight,
        headers,
        partitions,
        rows
      } = utils.buildRowConfig(nextListContainer, buffers.offset, stackingHeaders, oldCollapsedSections);
      this.setState({ avgRowHeight, collapsedSections, contentHeight, headers, partitions, rows });
    }

    if (!_.isEqual(prevScrollTo, nextScrollTo)) {
      this._scrollTo(nextScrollTo);
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return !_.isEqual(this.props, nextProps) ||
      !_.isEqual(this.state, nextState);
  }

  componentDidUpdate(prevProps, prevState) {
    this._updateDimensions(prevProps, prevState);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateDimensions);
  }

  // private

  _applyScrollChange({ deltaX, deltaY }) {
    const {
      props: {
        horizontalScrollConfig
      },
      state: { contentHeight, partitions, shouldRender },
      _horizontalScrollbar,
      _verticalScrollbar
    } = this;
    const withHorizontalScrolling = !!horizontalScrollConfig && shouldRender.horizontalScrollbar;

    const scrollChanges = {};

    // vertical
    if (shouldRender.verticalScrollbar) {
      const maxHeight = utils.getMaxHeight(contentHeight, _verticalScrollbar.offsetHeight);
      const verticalTransform = this.state.verticalTransform + deltaY;
      _.assign(scrollChanges, utils.getScrollValues(verticalTransform, maxHeight, partitions));
    }

    // horizontal scrolling
    if (withHorizontalScrolling) {
      scrollChanges.horizontalTransform = _.clamp(
        this.state.horizontalTransform + deltaX,
        0,
        _horizontalScrollbar.scrollWidth - _horizontalScrollbar.offsetWidth
      );
    }

    this.setState(scrollChanges, () => {
      if (shouldRender.verticalScrollbar) {
        _verticalScrollbar.scrollTop = scrollChanges.verticalTransform;
      }
      if (withHorizontalScrolling) {
        _horizontalScrollbar.scrollLeft = scrollChanges.horizontalTransform;
      }
    });
  }

  _getContentWidth() {
    const {
      props: {
        guttersConfig: {
          left: {
            handleWidth: leftHandleWidth = constants.LEFT_HANDLE_WIDTH,
            width: leftGutterWidth = constants.LEFT_GUTTER_WIDTH
          } = {},
          right: {
            handleWidth: rightHandleWidth = constants.RIGHT_HANDLE_WIDTH,
            width: rightGutterWidth = constants.RIGHT_GUTTER_WIDTH
          } = {}
        } = {},
        horizontalScrollConfig: {
          contentWidth = 0
        } = {}
      }
    } = this;
    return _.sum([
      contentWidth,
      leftGutterWidth,
      leftHandleWidth,
      rightHandleWidth,
      rightGutterWidth
    ]);
  }

  _getThrottledAnimationFrameFn(scrollTo) {
    const { horizontalTransform, verticalTransform } = this.state;
    const delta = _.clone(scrollTo)
      .sub(new Point(horizontalTransform, verticalTransform));

    return _.throttle(easer(easedElapsedTime => {
      const {
        props: {
          horizontalScrollConfig
        },
        state: {
          contentHeight,
          partitions,
          scrollingToPosition: latestScrollingToPosition,
          shouldRender
        },
        _horizontalScrollbar,
        _verticalScrollbar
      } = this;
      if (!_.isEqual(scrollTo, latestScrollingToPosition)) {
        return;
      }

      const withHorizontalScrolling = !!horizontalScrollConfig && shouldRender.horizontalScrollbar;
      const elapsedTime = easedElapsedTime > 0.999 ? 1 : easedElapsedTime;
      const deltaScrolled = new Point(delta.x, delta.y)
        .scale(elapsedTime);
      const newTransform = new Point(horizontalTransform, verticalTransform)
        .add(deltaScrolled);

      const scrollChanges = {};

      // vertical
      if (shouldRender.verticalScrollbar) {
        const maxHeight = utils.getMaxHeight(contentHeight, _verticalScrollbar.offsetHeight);
        _.assign(scrollChanges, utils.getScrollValues(newTransform.y, maxHeight, partitions));
      }

      // horizontal scrolling
      if (withHorizontalScrolling) {
        scrollChanges.horizontalTransform = _.clamp(
          newTransform.x,
          0,
          _horizontalScrollbar.scrollWidth - _horizontalScrollbar.offsetWidth
        );
      }

      this.setState(scrollChanges, () => {
        if (shouldRender.verticalScrollbar) {
          _verticalScrollbar.scrollTop = scrollChanges.verticalTransform;
        }
        if (withHorizontalScrolling) {
          _horizontalScrollbar.scrollLeft = scrollChanges.horizontalTransform;
        }
      });
    }), constants.ANIMATION_FPS_120, { leading: true });
  }

  _onHorizontalScroll() {
    const { scrollLeft = 0 } = this._horizontalScrollbar || {};
    this.setState({ horizontalTransform: scrollLeft });
  }

  _onMouseWheel({ deltaX, deltaY }) {
    this._onThrottledMouseWheel({ deltaX, deltaY });
  }

  _onResize({ clientX }) {
    const { baseWidth, performing, side, startingPosition } = this.state.resize;
    const {
      [side]: {
        minWidth,
        onGutterResize = (() => {})
      } = {}
    } = this.props.guttersConfig || {};
    if (performing) {
      onGutterResize(utils.getResizeWidth(side, minWidth, baseWidth, startingPosition, clientX));
    }
  }

  _onVerticalScroll() {
    const {
      state: { contentHeight, partitions },
      _verticalScrollbar,
      _verticalScrollbar: { offsetHeight, scrollTop } = {}
    } = this;

    if (!_verticalScrollbar) {
      return;
    }

    const maxHeight = utils.getMaxHeight(contentHeight, offsetHeight);

    this.setState(utils.getScrollValues(scrollTop, maxHeight, partitions));
  }

  _renderContents() {
    const {
      props: {
        guttersConfig,
        horizontalScrollConfig: {
          passthroughOffsets = false
        } = {},
        verticalScrollConfig: {
          scrollbarWidth = constants.VERTICAL_SCROLLBAR_WIDTH
        } = {}
      },
      state: {
        buffers,
        horizontalTransform,
        partitions,
        rows,
        shouldRender,
        topPartitionIndex,
        verticalTransform
      }
    } = this;

    const contentsStyle = shouldRender.verticalScrollbar ? {
      width: `calc(100% - ${scrollbarWidth}px)`
    } : undefined;

    const weightedPartitionIndex = topPartitionIndex * buffers.offset;
    const startingRowIndex = Math.min(weightedPartitionIndex, rows.length);
    const endingRowIndex = weightedPartitionIndex + buffers.display;

    const rowsWeWillRender = _.slice(rows, startingRowIndex, endingRowIndex);
    const partitionedRows = _.chunk(rowsWeWillRender, buffers.offset);
    const renderedPartitions = _.map(partitionedRows, (row, outerIndex) => {
      const partitionIndex = outerIndex + topPartitionIndex;
      const basePartitionOffset = partitions[partitionIndex];
      const partitionStyle = {
        transform: `translate3d(-0px, ${basePartitionOffset - verticalTransform}px, 0px)`
      };

      return (
        <div className='rickscroll__partition' key={partitionIndex} style={partitionStyle}>
          {_.map(
            row,
            ({
              className,
              contentComponent,
              contentClassName,
              gutters,
              height,
              isHeader,
              props: rowProps
            }, innerIndex) => (
              <Row
                className={className}
                contentClassName={contentClassName}
                contentComponent={contentComponent}
                gutters={gutters}
                guttersConfig={guttersConfig}
                horizontalTransform={horizontalTransform}
                index={innerIndex}
                isHeader={isHeader}
                key={innerIndex}
                onStartResize={this._startResize}
                passthroughOffsets={passthroughOffsets}
                rowHeight={height}
                rowProps={rowProps}
              />
            )
          )}
        </div>
      );
    });

    const { bottomHeaderGutter, header, topHeaderGutter } = this._renderHeader();

    const getContentsRef = r => { this._contents = r; };

    return (
      <div className='rickscroll__contents' key='contents' ref={getContentsRef} style={contentsStyle}>
        {header}
        {topHeaderGutter}
        {renderedPartitions}
        {bottomHeaderGutter}
      </div>
    );
  }

  _renderCorner() {
    const {
      props: {
        horizontalScrollConfig,
        horizontalScrollConfig: {
          scrollbarHeight = constants.HORIZONTAL_SCROLLBAR_HEIGHT
        } = {},
        verticalScrollConfig: {
          scrollbarWidth = constants.VERTICAL_SCROLLBAR_WIDTH
        } = {}
      },
      state: { shouldRender }
    } = this;

    const shouldRenderCorner = !!horizontalScrollConfig && shouldRender.verticalScrollbar;

    if (!shouldRenderCorner) {
      return null;
    }

    const cornerStyle = {
      height: `${scrollbarHeight}px`,
      width: `${scrollbarWidth}px`
    };

    return <div className='rickscroll__corner' style={cornerStyle} />;
  }

  _renderHeader() {
    const {
      props: {
        guttersConfig,
        headerType = constants.headerType.DEFAULT
      },
      state: {
        headers,
        rows,
        verticalTransform
      },
      _contents
    } = this;

    if (!headers || headers.length === 0) {
      return {};
    }

    const { lockPosition: maxLockPosition } = headers[headers.length - 1];
    const findNextHeaderIndex = _.findIndex(headers, ({ lockPosition }) => lockPosition > verticalTransform);
    const nextHeaderIndex = findNextHeaderIndex === -1 ? headers.length : findNextHeaderIndex;

    if (headerType === constants.headerType.STACKING) {
      const topHeaderGutter = (
        <div className='rickscroll__header-gutter rickscroll__header-gutter--top' key='top-header-gutter'>
          {_.times(nextHeaderIndex, headerIndex => {
            const { index: headerRowIndex } = headers[headerIndex];
            const { className, contentComponent, height, props: rowProps } = rows[headerRowIndex];

            return (
              <Row
                className={className}
                contentComponent={contentComponent}
                guttersConfig={guttersConfig}
                horizontalTransform={0}
                index={headerRowIndex}
                key={headerIndex}
                rowHeight={height}
                rowProps={rowProps}
              />
            );
          })}
        </div>
      );

      let bottomGutterStartIndex = nextHeaderIndex;
      /* We want to erase headers as they come into view in the contents view from the header gutter
       * We solve for the vertical transform that we need to remove a header from the bottom gutter:
       * height: height of the header we are transitioning
       * topHeight: height of all other gutters pinned to the top, not including baseHeight
       * realOffset: the verticalTransform that aligns the next header with the top of the rickscroll__contents
       * bottomHeight: the height of the bottom gutter of combined headers
       * adjustedBottomHeight: the total height of the headers in the bottom gutter with the baseHeight
       * adjustedTransform: the vertical transform that is adjusted to the scale of viewable contents
       * ------------------------------------------------------------------------------------------------------------
       * we should delete the top header from the bottom gutter if the adjusted transform is smaller than the
       * height of contents window
       */
      if (_contents) {
        const { height: baseHeight } = headers[0];
        const {
          adjustHeaderOffset: topHeight,
          realOffset: removeFirstHeaderOffset
        } = headers[nextHeaderIndex] || headers[nextHeaderIndex - 1];
        const { adjustHeaderOffset: bottomHeight } = headers[headers.length - 1];
        const adjustedBottomHeight = (baseHeight + bottomHeight) - topHeight;
        const adjustedTransform = (removeFirstHeaderOffset - verticalTransform) + adjustedBottomHeight;
        if (bottomGutterStartIndex !== headers.length && adjustedTransform <= _contents.clientHeight - 1) {
          bottomGutterStartIndex++;
          const skipHeadersUntil = _(headers)
            .slice(bottomGutterStartIndex)
            .findIndex(({ adjustHeaderOffset, realOffset }) => {
              const restHeight = bottomHeight - adjustHeaderOffset;
              return realOffset + topHeight >= ((_contents.clientHeight + verticalTransform) - restHeight);
            });

          if (skipHeadersUntil >= 0) {
            bottomGutterStartIndex += skipHeadersUntil;
          } else {
            bottomGutterStartIndex = headers.length;
          }
        }
      }

      const bottomHeaderGutter = (
        <div className='rickscroll__header-gutter rickscroll__header-gutter--bottom' key='bottom-header-gutter'>
          {_(headers).slice(bottomGutterStartIndex).map(({ index: headerRowIndex, lockPosition }, index) => {
            const headerIndex = bottomGutterStartIndex + index;
            const { className, contentComponent, height, props: rowProps } = rows[headerRowIndex];

            return (
              <Row
                className={className}
                contentComponent={contentComponent}
                guttersConfig={guttersConfig}
                horizontalTransform={0}
                index={headerRowIndex}
                key={headerIndex}
                rowHeight={height}
                rowProps={rowProps}
              />
            );
          }).value()}
        </div>
      );

      return { bottomHeaderGutter, topHeaderGutter };
    } else if (headerType === constants.headerType.LOCKING) {
      const headerIndex = nextHeaderIndex - 1;
      const { lockPosition } = headers[nextHeaderIndex] || headers[headerIndex];

      const { index: headerRowIndex } = headers[headerIndex];
      const { className, contentComponent, height, props: rowProps } = rows[headerRowIndex];

      const headerStyle = {
        height: `${height}px`,
        transform: 'translate3d(0px, 0px, 0px)'
      };

      if (verticalTransform < maxLockPosition && verticalTransform >= lockPosition - height) {
        const overlap = (lockPosition - verticalTransform);
        const headerOffset = height - overlap;
        headerStyle.transform = `translate3d(0px, -${headerOffset}px, 0px)`;
      }


      const header = (
        <div className='rickscroll__header' key={`header-${headerRowIndex}`} style={headerStyle}>
          <Row
            className={className}
            contentComponent={contentComponent}
            guttersConfig={guttersConfig}
            horizontalTransform={0}
            index={headerRowIndex}
            rowHeight={height}
            rowProps={rowProps}
          />
        </div>
      );

      return { header };
    }

    return {};
  }

  _renderHorizontalScrollbar() {
    const {
      props: {
        horizontalScrollConfig,
        horizontalScrollConfig: {
          className,
          scrollbarHeight = constants.HORIZONTAL_SCROLLBAR_HEIGHT
        } = {}
      },
      state: { shouldRender }
    } = this;

    const withHorizontalScrolling = !!horizontalScrollConfig && shouldRender.horizontalScrollbar;

    if (!withHorizontalScrolling) {
      return null;
    }

    const sharedStyle = {
      height: `${scrollbarHeight}px`
    };
    const contentWidth = this._getContentWidth();
    const fillerStyle = { height: '1px', width: `${contentWidth}px` };

    const getHorizontalScrollbarRef = r => { this._horizontalScrollbar = r; };
    const horizontalScrollbarClassName = classnames('rickscroll__horizontal-scrollbar', className);

    return (
      <div className='rickscroll__bottom-wrapper' style={sharedStyle}>
        <div
          className={horizontalScrollbarClassName}
          key='scrollable'
          onScroll={this._onHorizontalScroll}
          ref={getHorizontalScrollbarRef}
          style={sharedStyle}
        >
          <div style={fillerStyle} />
        </div>
        {this._renderCorner()}
      </div>
    );
  }

  _renderVerticalScrollbar() {
    const {
      props: {
        verticalScrollConfig: {
          className,
          scrollbarWidth = constants.VERTICAL_SCROLLBAR_WIDTH
        } = {}
      },
      state: { contentHeight, shouldRender }
    } = this;

    if (!shouldRender.verticalScrollbar) {
      return null;
    }

    const fillerStyle = {
      height: `${contentHeight}px`,
      width: '1px'
    };
    const verticalScrollbarStyle = {
      minWidth: `${scrollbarWidth}px`
    };

    const getVerticalScrollbarRef = r => { this._verticalScrollbar = r; };
    const verticalScrollbarCassName = classnames('rickscroll__vertical-scrollbar', className);
    return (
      <div
        className={verticalScrollbarCassName}
        onScroll={this._onVerticalScroll}
        ref={getVerticalScrollbarRef}
        style={verticalScrollbarStyle}
      >
        <div style={fillerStyle} />
      </div>
    );
  }

  _scrollTo({ x = 0, y = 0 }) {
    let { animation } = this.state;
    if (animation) {
      animation.stop();
    }

    const scrollingToPosition = new Point(x, y);

    animation = new AnimationTimer()
      .on('tick', this._getThrottledAnimationFrameFn(scrollingToPosition))
      .play();

    this.setState({ animation, scrollingToPosition });
  }

  _shouldRenderScrollbars(contentHeightOverride) {
    const {
      props: {
        horizontalScrollConfig: {
          scrollbarHeight = constants.HORIZONTAL_SCROLLBAR_HEIGHT
        } = {},
        verticalScrollConfig: {
          scrollbarWidth = constants.VERTICAL_SCROLLBAR_WIDTH
        } = {}
      },
      state: {
        contentHeight: contentHeightFromState
      },
      _scrollable: { clientHeight, clientWidth }
    } = this;

    const contentHeight = contentHeightOverride || contentHeightFromState;
    const clientHeightTooSmall = clientHeight < contentHeight;
    const clientHeightTooSmallWithHorizontalScrollbar = clientHeight < (contentHeight + scrollbarHeight);

    const contentWidth = this._getContentWidth();
    const clientWidthTooSmall = clientWidth < contentWidth;
    const clientWidthTooSmallWithVerticalScrollbar = clientWidth < (contentWidth + scrollbarWidth);

    const shouldRenderVerticalScrollbar = clientHeightTooSmall || (
      clientWidthTooSmall && clientHeightTooSmallWithHorizontalScrollbar
    );
    const shouldRenderHorizontalScrollbar = clientWidthTooSmall || (
      clientHeightTooSmall && clientWidthTooSmallWithVerticalScrollbar
    );

    return {
      horizontalScrollbar: shouldRenderHorizontalScrollbar,
      verticalScrollbar: shouldRenderVerticalScrollbar
    };
  }

  _startResize(side) {
    return ({ clientX }) => {
      const {
        guttersConfig: {
          [side]: {
            width: baseWidth
          }
        } = {}
      } = this.props;
      this.setState({
        resize: {
          baseWidth,
          performing: true,
          side,
          startingPosition: clientX
        }
      });
    };
  }

  _stopResize() {
    this.setState({
      resize: {
        baseWidth: 0,
        performing: false,
        side: '',
        startingPosition: 0
      }
    });
  }

  _updateDimensions(prevProps, prevState = {}) {
    const {
      props: {
        horizontalScrollConfig,
        verticalScrollConfig
      },
      state: {
        avgRowHeight,
        buffers,
        rows,
        window: { height, width }
      },
      _contents,
      _scrollable: { clientHeight, clientWidth }
    } = this;

    const gutter = ['left', 'right'];
    const gutterIsEqual = side => {
      const accessor = `guttersConfig.${side}`;
      return _.isEqual(_.get(prevProps, accessor), _.get(this.props, accessor));
    };

    const avgPartitionHeight = buffers.offset * avgRowHeight;
    const numRowsInContents = _.ceil(_contents.clientHeight / avgRowHeight);

    if (
      clientHeight === height &&
      clientWidth === width &&
      numRowsInContents + avgPartitionHeight <= buffers.display * avgRowHeight &&
      _.isEqual(prevProps.horizontalScrollConfig, horizontalScrollConfig) &&
      _.isEqual(prevProps.verticalScrollConfig, verticalScrollConfig) &&
      _.get(prevState, 'rows.length') === rows.length &&
      _.every(gutter, gutterIsEqual)
    ) {
      return;
    }

    this.updateDimensions();
  }

  // public

  scrollToHeader(headerIndex) {
    const {
      props: { lists },
      state: { headers }
    } = this;

    if (!lists || headerIndex >= lists.length || headerIndex < 0) {
      return;
    }

    this._scrollTo({ y: headers[headerIndex].lockPosition });
  }

  toggleSection(sectionIndex) {
    const {
      props: {
        headerType = constants.headerType.DEFAULT,
        lists
      },
      state: { buffers, collapsedSections: oldCollapsedSections }
    } = this;
    const stackHeaders = headerType === constants.headerType.STACKING;

    if (!lists || sectionIndex >= lists.length || sectionIndex < 0) {
      return;
    }

    const collapsedState = !oldCollapsedSections[sectionIndex];
    oldCollapsedSections[sectionIndex] = collapsedState;

    const {
      avgRowHeight,
      collapsedSections,
      contentHeight,
      headers,
      partitions,
      rows
    } = utils.buildRowConfig(lists, buffers.offset, stackHeaders, oldCollapsedSections);
    this.setState({ avgRowHeight, collapsedSections, contentHeight, headers, partitions, rows });
  }

  updateDimensions() {
    const {
      state: {
        avgRowHeight,
        buffers
      },
      _contents,
      _scrollable: { clientHeight, clientWidth }
    } = this;

    const shouldRender = this._shouldRenderScrollbars();
    const numRowsInContents = _.ceil(_contents.clientHeight / avgRowHeight);

    buffers.display = numRowsInContents + (2 * buffers.offset);
    buffers.display += buffers.offset - (buffers.display % buffers.offset);

    const newState = {
      buffers,
      shouldRender,
      window: {
        height: clientHeight,
        width: clientWidth
      }
    };

    if (!shouldRender.verticalScrollbar) {
      newState.verticalTransform = 0;
      newState.topPartitionIndex = 0;
      if (this._verticalScrollbar) {
        this._verticalScrollbar.scrollTop = 0;
      }
    }

    if (!shouldRender.horizontalScrollbar) {
      newState.horizontalTransform = 0;
      if (this._horizontalScrollbar) {
        this._horizontalScrollbar.scrollLeft = 0;
      }
    }

    this.setState(newState);
  }

  render() {
    const {
      className,
      horizontalScrollConfig,
      horizontalScrollConfig: {
        scrollbarHeight = constants.HORIZONTAL_SCROLLBAR_HEIGHT
      } = {},
      style = {}
    } = this.props;
    const {
      resize: { performing },
      shouldRender
    } = this.state;

    const scrollableClassName = classnames('rickscroll', {
      'rickscroll--performing-resize': performing
    }, className);
    const topWrapperStyle = !!horizontalScrollConfig && shouldRender.horizontalScrollbar ? {
      height: `calc(100% - ${scrollbarHeight}px)`
    } : undefined;

    const getScrollableRef = r => { this._scrollable = r; };

    return (
      <div className={scrollableClassName} ref={getScrollableRef} style={style}>
        <div
          className='rickscroll__top-wrapper'
          key='top-wrapper'
          onMouseMove={this._onResize}
          onMouseUp={this._stopResize}
          onWheel={this._onMouseWheel}
          style={topWrapperStyle}
        >
          {this._renderContents()}
          {this._renderVerticalScrollbar()}
        </div>
        {this._renderHorizontalScrollbar()}
      </div>
    );
  }
}

Scrollable.propTypes = {
  className: types.string,
  guttersConfig: utils.types.guttersConfig,
  headerType: utils.types.headerType,
  horizontalScrollConfig: utils.types.horizontalScrollConfig,
  list: utils.types.list,
  lists: utils.types.lists,
  parentHeight: types.number,
  parentWidth: types.number,
  scrollTo: utils.types.scrollTo,
  style: types.object,
  verticalScrollConfig: utils.types.verticalScrollConfig
};

module.exports = Scrollable;
