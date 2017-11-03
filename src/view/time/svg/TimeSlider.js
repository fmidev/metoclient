/**
 * @fileoverview Raphael implementation of time view.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

import EventEmitter from 'wolfy87-eventemitter'
import SVG from 'svg.js/dist/svg.js'
import * as utils from '../../../utils'
import moment from 'moment-timezone'
import fi from 'moment/locale/fi'
import sv from 'moment/locale/sv'
import uk from 'moment/locale/uk'
import jQuery from 'jquery'
import 'jquery-mousewheel'
// import Interface from 'contracts-es6';
// import Slider from '../../interfaces/Slider';

// export default class TimeSlider extends Interface.StrictInterface(Slider) {
export default class TimeSlider {
  /**
   * Constructs Raphael based time view.
   * @param {string} container Time slider container.
   * @param {Object} config Configuration for time view.
   * @extends {goog.Disposable}
   * @implements {fi.fmi.metoclient.ui.animator.view.interfaces.TimeSlider}
   * @constructor
   */
  constructor (config, container) {
    // super();
    this.config_ = config
    this.container_ = container
    this.paper_ = null
    this.visualPointer_ = null
    this.frameWidth_ = 0
    this.playPauseButton_ = null
    this.frameStatusRects_ = null
    this.animationTime_ = null
    this.animationPlay_ = false
    this.beginTime_ = null
    this.endTime_ = null
    this.resolutionTime_ = null
    this.timeZone_ = config['timeZone']
    this.timeZoneLabel_ = config['timeZoneLabel']
    this.animationPlayListener_ = null
    this.actionEvents = new EventEmitter()
    this.variableEvents = new EventEmitter()
  };

// Todo: jaa pienemmiksi funktioiksi
  /** @inheritDoc */
  createTimeSlider (currentTime, animationTime, beginTime, endTime, resolutionTime, numIntervals) {
    const self = this
    let containerWidth,
      frameWidth,
      frameHeight,
      paperWidth,
      paperHeight,
      draw,
      sliderWidth,
      sliderOffset,
      labelPhase,
      labelStart,
      hourDiff,
      phaseDiff,
      playButtonBackground,
      background,
      imagePath,
      playPauseButton,
      past,
      frameStatusRects,
      tickTexts,
      previousTime,
      time,
      date,
      i,
      x,
      y,
      tickText,
      tick,
      tickHeight,
      timeLabel,
      pastWidth,
      futureWidth,
      x0,
      x1,
      x2,
      x3,
      x4,
      y0,
      y1,
      y2,
      pointer,
      pointerLabel,
      pointerSet,
      pixelTime,
      movePointerDrag,
      movePointerTouch,
      upPointerDrag,
      clickableArea,
      startPointerDrag,
      startPointerTouch,
      logo
    if (!SVG.supported) {
      return;
    }
    if (!this.config_['showTimeSlider']) {
      return
    }
    this.animationTime_ = animationTime
    if (beginTime > endTime) {
      return
    }
    this.beginTime_ = beginTime
    this.endTime_ = endTime
    if (resolutionTime === 0) {
      return
    }
    this.resolutionTime_ = resolutionTime
    if (numIntervals === 0) {
      return
    }
    if (this.animationPlayListener_ === null) {
      this.initAnimationPlayListener()
    }
    jQuery(this.container_).empty()
    containerWidth = Math.max(jQuery(this.container_).width(), 1)
    sliderOffset = this.config_['sliderOffset']
    sliderWidth = Math.max(containerWidth - this.config_['imageWidth'] - 2 * sliderOffset, 1)
    frameWidth = numIntervals ? sliderWidth / numIntervals : null
    this.frameWidth_ = frameWidth
    frameHeight = this.config_['sliderHeight'] - this.config_['statusHeight']
    paperWidth = containerWidth
    paperHeight = this.config_['imageHeight'] + this.config_['pointerHeight']
    labelPhase = Math.max(Math.round(5 * this.config_['tickTextSize'] / frameWidth), 1)
    draw = SVG(this.container_)
      .size(containerWidth, paperHeight)
      .style({
        strokeWidth: '0',
        position: 'absolute',
        top: '',
        left: '0',
        bottom: '0',
        width: '100%',
      })
    playButtonBackground = draw
      .path(`M${sliderOffset} 0 l0 ${this.config_['imageHeight']}l${this.config_['imageWidth']} 0l0 -${this.config_['imageHeight']}Z`)
      .attr({
        'fill': this.config_['imageBackgroundColor']
      })
      .on('mouseover', function (e) {
        this.attr({
          'fill': self.config_['imageHoverColor']
        })
      })
      .on('mouseout', function (e) {
        this.attr({
          'fill': self.config_['imageBackgroundColor']
        })
      })

    background = draw
      .path(`M${sliderOffset + this.config_['imageWidth']} 0 l0 ${this.config_['imageHeight']}l${sliderWidth} 0l0 -${this.config_['imageHeight']}Z`)
      .attr({
        'fill': '#FFFFFF'
      })
    background.node.id = 'fmi-animator-timeslider-background'
    imagePath = this.animationPlay_ ? this.config_['pauseImagePath'] : this.config_['playImagePath']
    playPauseButton = draw
      .image(imagePath, this.config_['imageWidth'], this.config_['imageHeight'])
      .move(sliderOffset, 0)
      .attr({
        'cursor': 'pointer'
      }).click(e => {
        self.animationPlay_ = !self.animationPlay_
        self.variableEvents.emitEvent('animationPlay', [self.animationPlay_])
      }).on('mouseover', e => {
        playButtonBackground.attr({
          'fill': self.config_['imageHoverColor']
        })
      }).on('mouseout', e => {
        playButtonBackground.attr({'fill': self.config_['imageBackgroundColor']})
      })
    this.playPauseButton_ = playPauseButton
    labelStart = 0
    for (i = 1; i < numIntervals; i++) {
      date = new Date(beginTime + i * resolutionTime)
      if ((date.getMinutes() === 0) && (date.getSeconds() === 0) && (date.getMilliseconds() === 0)) {
        if (labelStart === 0) {
          labelStart = i
        } else {
          hourDiff = i - labelStart
          if (labelPhase <= hourDiff) {
            phaseDiff = hourDiff % labelPhase
            if (phaseDiff !== 0) {
              labelPhase = hourDiff
            }
          } else {
            labelPhase += hourDiff - labelPhase % hourDiff
          }
          break
        }
      }
    }
    past = 0
    frameStatusRects = []
    tickTexts = []
    previousTime = null
    for (i = -1; i < numIntervals; i++) {
      time = beginTime + i * resolutionTime
      if (time <= currentTime) {
        past = i + 1
      }
      if (i === numIntervals - 1) {
        break
      }
      x = sliderOffset + this.config_['imageWidth'] + (i + 1) * frameWidth
      // Status color bars
      frameStatusRects.push(draw
        .rect(frameWidth, this.config_['statusHeight'])
        .move(x, frameHeight)
        .fill(this.config_['loadedColor']))
      // Skip the first tick and label
      if (i === -1) {
        continue
      }
      y = this.config_['statusHeight']
      if ((i - labelStart) % labelPhase === 0) {
        tickText = utils.getTickText(time, this.beginTime_, this.resolutionTime_, this.timeZone_, this.config_['locale'], previousTime)
        y = this.config_['tickHeight']
        tickHeight = this.config_['tickHeight']
        timeLabel = draw
          .text(tickText)
          .move(x, this.config_['tickTextYOffset'])
          .attr({
            'text-anchor': 'middle',
            'fill': this.config_['tickTextColor'],
            'font-size': Math.max(this.config_['tickTextSize'], this.config_['tickTextSize'])
          })
        previousTime = time
      } else {
        tickText = ''
        tickHeight = this.config_['statusHeight']
      }
      tickTexts.push(tickText)
      y = frameHeight + this.config_['statusHeight'] - y
      tick = draw
        .path(`M${x} ${y}l0 ${tickHeight}`)
        .attr({
          'stroke': this.config_['tickColor'],
          'stroke-width': '1'
        })
    }
    this.frameStatusRects_ = frameStatusRects
    pastWidth = past * frameWidth
    futureWidth = sliderWidth - pastWidth
    if (futureWidth < 1.0e-5) {
      futureWidth = 0
    }
    draw
      .rect(pastWidth, frameHeight)
      .move(sliderOffset + this.config_['imageWidth'], 0)
      .fill(this.config_['pastColor'])
      .back()
    draw
      .rect(futureWidth, frameHeight)
      .move(sliderOffset + this.config_['imageWidth'] + pastWidth, 0)
      .fill(this.config_['futureColor'])
      .back()

    // Time zone label
    draw
      .text(this.timeZoneLabel_)
      .move(paperWidth - this.config_['sliderOffset'] - 1, frameHeight - 0.5 * this.config_['tickTextSize'] - 1)
      .attr({
        'text-anchor': 'end',
        'color': this.config_['tickTextColor'],
        'font-size': this.config_['tickTextSize']
      })

    // Create pointer
    x0 = sliderOffset + this.config_['imageWidth']
    x1 = x0 + this.config_['statusHeight']
    x2 = x0 + 0.5 * this.config_['pointerWidth']
    x3 = x0 - 0.5 * this.config_['pointerWidth']
    x4 = x0 - this.config_['statusHeight']
    y0 = frameHeight
    y1 = y0 + this.config_['statusHeight']
    y2 = y1 + this.config_['pointerHeight']
    pointer = draw
      .path(`M${x0} ${y0}L${x1} ${y1}L${x2} ${y1}L${x2} ${y2}L${x3} ${y2}L${x3} ${y1}L${x4} ${y1}Z`)
      .attr({
        'fill': this.config_['pointerColor'],
        'stroke': this.config_['pointerStrokeColor'],
        'stroke-width': '1',
        'cursor': 'pointer'
      })
    pointerLabel = draw
      .text('')
      .move(x0, y2 - this.config_['pointerTextYOffset'])
      .attr({
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        'fill': this.config_['pointerTextColor'],
        'font-size': this.config_['pointerTextSize'],
        'font-weight': 'bold',
        'cursor': 'pointer'
      })
    pointerSet = draw.set()
    pointerSet.add(
      pointer,
      pointerLabel
    )
    startPointerDrag = ({pageX}) => {
      pointer.startDragTime = self.animationTime_
      pointer.startDragX = pageX
    }
    startPointerTouch = ({touches}) => {
      pointer.startDragTime = self.animationTime_
      pointer.startDragX = touches[0].clientX
    }
    pixelTime = resolutionTime / frameWidth
    movePointerDrag = ({pageX}) => {
      let newTime, dx
      if (pointer.startDragX == null) {
        return
      }
      dx = pageX - pointer.startDragX
      if (paperWidth === 0) {
        return
      }
      if (!self.animationPlay_) {
        newTime = pointer.startDragTime + dx * pixelTime
        newTime = Math.min(newTime, self.endTime_)
        newTime = Math.max(newTime, self.beginTime_)
        self.variableEvents.emitEvent('animationTime', [newTime])
      }
    }
    movePointerTouch = ({originalEvent}) => {
      let newTime, dx
      if (pointer.startDragX == null) {
        return
      }
      dx = originalEvent.touches[0].clientX - pointer.startDragX
      if (paperWidth === 0) {
        return
      }
      if (!self.animationPlay_) {
        newTime = Math.min(pointer.startDragTime + dx * pixelTime, self.endTime_)
        self.variableEvents.emitEvent('animationTime', [newTime])
      }
    }
    upPointerDrag = () => {
      pointer.startDragX = null
      let animationTime = beginTime + Math.round((self.animationTime_ - beginTime) / resolutionTime) * resolutionTime
      if (animationTime < beginTime) {
        animationTime = beginTime
      }
      self.variableEvents.emitEvent('animationTime', [animationTime])
    }
    pointer.on('mousedown', startPointerDrag)
    pointerLabel.on('mousedown', startPointerDrag)
    pointer.on('touchstart', startPointerTouch)
    pointerLabel.on('touchstart', startPointerDrag)
    jQuery(document).off('mousemove', movePointerDrag).on('mousemove', movePointerDrag)
    jQuery(document).off('touchmove', movePointerTouch).on('touchmove', movePointerTouch)
    jQuery(document).off('mouseup', upPointerDrag).on('mouseup', upPointerDrag)
    jQuery(document).off('touchend', upPointerDrag).on('touchend', upPointerDrag)
    clickableArea = draw
      .rect(paperWidth, this.config_['imageHeight'])
      .attr({
        'fill': this.config_['imageBackgroundColor'],
        'fill-opacity': '0',
        'cursor': 'pointer'
      }).on('mousedown', ({offsetX, layerX}) => {
        let x, xt
        if (pixelTime === 0) {
          return
        }
        if (paperWidth === 0) {
          return
        }
        self.animationPlay_ = false
        self.variableEvents.emitEvent('animationPlay', [self.animationPlay_])
        x = offsetX || layerX
        xt = sliderOffset + frameWidth + self.config_['imageWidth'] + (self.animationTime_ - beginTime) / pixelTime
        if (x < xt) {
          self.actionEvents.emitEvent('previous')
        } else if (xt < x) {
          self.actionEvents.emitEvent('next')
        }
      })
    // Mouse wheel
    jQuery(clickableArea.node).bind('mousewheel', (event, delta) => {
      if (delta > 0) {
        // Scrolling up.
        self.actionEvents.emitEvent('next')
      } else if (delta < 0) {
        // Scrolling down.
        self.actionEvents.emitEvent('previous')
      }
      // Prevent scrolling of the page.
      return false
    })
    if (this.config_.logoPath) {
      jQuery(this.container_)
      logo = jQuery('<img id="metoclient-logo" src="' + this.config_.logoPath + '" />').css({
        'float': 'right',
        'margin-right': sliderOffset
      })
      jQuery(this.container_).append(logo)
    }
    this.draw_ = draw
    this.visualPointer_ = pointerSet
    this.updatePointer(animationTime)
    playPauseButton.front()
    pointerSet.front()
    background.back()
  };

  /**
   * Sets pointer time.
   * @param {number} time Time value.
   */
  setPointerTime (time) {
    this.visualPointer_.time = time
  };

  /**
   * Set pointer text.
   * @param {number} time Time value.
   */
  setPointerText (time) {
    this.visualPointer_.last().text(utils.getTickText(time, this.beginTime_, this.resolutionTime_, this.timeZone_, this.config_['locale']))
  };

  /**
   * Move pointer element on the time slider.
   * @param dx Horizontal displacement.
   */
  movePointer (dx) {
    this.visualPointer_.transform({
      x: dx
    })
  };

  /** @inheritDoc */
  setAnimationTime (animationTime) {
    this.animationTime_ = animationTime
    this.updatePointer(animationTime)
  };

  /**
   * Updates pointer text and location on the time slider.
   * @param animationTime Time value.
   */
  updatePointer (animationTime) {
    const dx = this.frameWidth_ * (1 + (animationTime - this.beginTime_) / this.resolutionTime_)
    this.movePointer(dx)
    this.setPointerTime(animationTime)
    this.setPointerText(animationTime)
  };

  /** @inheritDoc */
  updateTimeLoaderVis (numIntervalItems) {
    if (!this.config_['showTimeSlider']) {
      return
    }
    const len = Math.min(this.frameStatusRects_.length, numIntervalItems.length)
    for (let i = 0; i < len; i++) {
      switch (numIntervalItems[i].status) {
        case 'Loading':
          this.frameStatusRects_[i].attr({
            'fill': this.config_['loadingColor']
          })
          break
        case 'Ready':
          this.frameStatusRects_[i].attr({
            'fill': this.config_['loadedColor']
          })
          break
        case 'Error':
          this.frameStatusRects_[i].attr({
            'fill': this.config_['loadingErrorColor']
          })
          break
        default:
          this.frameStatusRects_[i].attr({
            'fill': this.config_['notLoadedColor']
          })
      }
    }
  };

  /**
   * Initialize button listener.
   */
  initAnimationPlayListener () {
    const self = this
    // Update button image
    this.animationPlayListener_ = play => {
      self.playPauseButton_.attr('src', self.config_[play ? 'pauseImagePath' : 'playImagePath'])
    }
    this.variableEvents.addListener('animationPlay', this.animationPlayListener_)
  };

  /** @inheritDoc */
  setAnimationPlay (animationPlay) {
    this.animationPlay_ = animationPlay
    if (this.playPauseButton_ == null) {
      return
    }
    if (animationPlay) {
      this.playPauseButton_.attr({
        'src': this.config_['pauseImagePath']
      })
      this.playPauseButton_.node.href.baseVal = this.config_['pauseImagePath']
    } else {
      this.playPauseButton_.attr({
        'src': this.config_['playImagePath']
      })
    }
  };

  /** @inheritDoc */
  setTimeZone (timeZone) {
    this.timeZone_ = timeZone
  };

  /** @inheritDoc */
  setTimeZoneLabel (timeZoneLabel) {
    this.timeZoneLabel_ = timeZoneLabel
  };

  /** @inheritDoc */
  destroyTimeSlider () {
    this.actionEvents.removeAllListeners()
    this.variableEvents.removeAllListeners()
    if (this.draw_ != null) {
      this.draw_.clear()
      this.draw_ = null
    }
    jQuery(this.container_).empty()
  };
}
