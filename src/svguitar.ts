import { QuerySelector } from '@svgdotjs/svg.js'
import { range } from './utils'
import { constants } from './constants'
import { Alignment, GraphcisElement, Graphics } from './graphics'
import { SvgJsGraphics } from './svgjs-graphics'
import { RoughJsGraphics } from './roughjs-graphics'

// Chart input types (compatible with Vexchords input, see https://github.com/0xfe/vexchords)
export type SilentString = 'x'
export type OpenString = 0
export type Finger = [number, number | OpenString | SilentString, string?]
export type Barre = { fromString: number; toString: number; fret: number }
export type Chord = { fingers: Finger[]; barres: Barre[] }

/**
 * Value for an open string (O)
 */
export const OPEN: OpenString = 0

/**
 * Value for a silent string (X)
 */
export const SILENT: SilentString = 'x'

/**
 * Possible positions of the fret label (eg. "3fr").
 */
export enum FretLabelPosition {
  LEFT = 'left',
  RIGHT = 'right'
}

export enum ChordStyle {
  normal = 'normal',
  handdrawn = 'handdrawn'
}

export interface ChordSettings {
  /**
   * Style of the chord diagram. Currently you can chose between "normal" and "handdrawn".
   */
  style?: ChordStyle

  /**
   * The number of strings
   */
  strings?: number

  /**
   * The number of frets
   */
  frets?: number
  /**
   * The starting fret (first fret is 1)
   */
  position?: number

  /**
   * These are the labels under the strings. Can be any string.
   */
  tuning?: string[]

  /**
   * The position of the fret label (eg. "3fr")
   */
  fretLabelPosition?: FretLabelPosition

  /**
   * The font size of the fret label
   */
  fretLabelFontSize?: number

  /**
   * The font size of the string labels
   */
  tuningsFontSize?: number

  /**
   * Size of a nut relative to the string spacing
   */
  nutSize?: number

  /**
   * Color of a finger / nut
   */
  nutColor?: string

  /**
   * Height of a fret, relative to the space between two strings
   */
  fretSize?: number

  /**
   * The minimum side padding (from the guitar to the edge of the SVG) relative to the whole width.
   * This is only applied if it's larger than the letters inside of the padding (eg the starting fret)
   */
  sidePadding?: number

  /**
   * The font family used for all letters and numbers
   */
  fontFamily?: string

  /**
   * The title of the chart
   */
  title?: string

  /**
   * Font size of the title. This is only the initial font size. If the title doesn't fit, the title
   * is automatically scaled so that it fits.
   */
  titleFontSize?: number

  /**
   * Space between the title and the chart
   */
  titleBottomMargin?: number

  /**
   * Global color of the whole chart. Can be overridden with more specifig color settings such as
   * @link titleColor or @link stringColor etc.
   */
  color?: string

  /**
   * The color of the title (overrides color)
   */
  titleColor?: string

  /**
   * The color of the strings (overrides color)
   */
  stringColor?: string

  /**
   * The color of the fret position (overrides color)
   */
  fretLabelColor?: string

  /**
   * The color of the tunings (overrides color)
   */
  tuningsColor?: string

  /**
   * The color of the frets (overrides color)
   */
  fretColor?: string

  /**
   * Barre chord rectangle border radius relative to the nutSize (eg. 1 means completely round endges, 0 means not rounded at all)
   */
  barreChordRadius?: number

  /**
   * Size of the Xs and Os above empty strings relative to the space between two strings
   */
  emptyStringIndicatorSize?: number

  /**
   * Global stroke width
   */
  strokeWidth?: number

  /**
   * The width of the top fret (only used if position is 1)
   */
  topFretWidth?: number
}

/**
 * All required chord settings. This interface is only used internally. From the outside, none of
 * the chord settings are required.
 */
interface RequiredChordSettings {
  style: ChordStyle
  strings: number
  frets: number
  position: number
  tuning: string[]
  tuningsFontSize: number
  fretLabelFontSize: number
  fretLabelPosition: FretLabelPosition
  nutSize: number
  sidePadding: number
  titleFontSize: number
  titleBottomMargin: number
  color: string
  emptyStringIndicatorSize: number
  strokeWidth: number
  topFretWidth: number
  fretSize: number
  barreChordRadius: number
  fontFamily: string
}

const defaultSettings: RequiredChordSettings = {
  style: ChordStyle.normal,
  strings: 6,
  frets: 5,
  position: 1,
  tuning: [],
  tuningsFontSize: 28,
  fretLabelFontSize: 38,
  fretLabelPosition: FretLabelPosition.RIGHT,
  nutSize: 0.65,
  sidePadding: 0.2,
  titleFontSize: 48,
  titleBottomMargin: 0,
  color: '#000',
  emptyStringIndicatorSize: 0.6,
  strokeWidth: 2,
  topFretWidth: 10,
  fretSize: 1.5,
  barreChordRadius: 0.25,
  fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif'
}

export class SVGuitarChord {
  private _graphics?: Graphics
  private settings: ChordSettings = {}

  private _chord: Chord = { fingers: [], barres: [] }

  constructor(private container: QuerySelector | HTMLElement) {}

  private get graphics(): Graphics {
    if (!this._graphics) {
      const style = this.settings.style || defaultSettings.style

      switch (style) {
        case ChordStyle.normal:
          this._graphics = new SvgJsGraphics(this.container)
          break
        case ChordStyle.handdrawn:
          this._graphics = new RoughJsGraphics(this.container)
          break
        default:
          throw new Error(`${style} is not a valid chord diagram style.`)
      }
    }

    return this._graphics
  }

  configure(settings: ChordSettings) {
    this.sanityCheckSettings(settings)

    // special case for style: remove current graphics instance if style changed. The new graphics
    // instance will be created lazily.
    if (settings.style !== this.settings.style) {
      delete this._graphics
    }

    this.settings = { ...this.settings, ...settings }

    return this
  }

  chord(chord: Chord): SVGuitarChord {
    this._chord = chord

    return this
  }

  draw(): { width: number; height: number } {
    this.clear()
    this.drawTopEdges()

    let y

    y = this.drawTitle(this.settings.titleFontSize || defaultSettings.titleFontSize)
    y = this.drawEmptyStringIndicators(y)
    y = this.drawTopFret(y)
    this.drawPosition(y)
    y = this.drawGrid(y)
    y = this.drawTunings(y)

    // now set the final height of the svg (and add some padding relative to the fret spacing)
    y = y + this.fretSpacing() / 10

    this.graphics.size(constants.width, y)

    return {
      width: constants.width,
      height: y
    }
  }

  private sanityCheckSettings(settings: Partial<ChordSettings>): void {
    if (typeof settings.strings !== 'undefined' && settings.strings <= 1) {
      throw new Error('Must have at least 2 strings')
    }

    if (typeof settings.frets !== 'undefined' && settings.frets < 0) {
      throw new Error('Cannot have less than 0 frets')
    }

    if (typeof settings.position !== 'undefined' && settings.position < 1) {
      throw new Error('Position cannot be less than 1')
    }

    if (typeof settings.fretSize !== 'undefined' && settings.fretSize < 0) {
      throw new Error('Fret size cannot be smaller than 0')
    }

    if (typeof settings.nutSize !== 'undefined' && settings.nutSize < 0) {
      throw new Error('Nut size cannot be smaller than 0')
    }

    if (typeof settings.strokeWidth !== 'undefined' && settings.strokeWidth < 0) {
      throw new Error('Stroke width cannot be smaller than 0')
    }
  }

  private drawTunings(y: number) {
    // add some padding relative to the fret spacing
    const padding = this.fretSpacing() / 5
    const stringXPositions = this.stringXPos()
    const strings = this.settings.strings || defaultSettings.strings
    const color = this.settings.tuningsColor || this.settings.color || defaultSettings.color
    const tuning = this.settings.tuning || defaultSettings.tuning
    const fontFamily = this.settings.fontFamily || defaultSettings.fontFamily
    const tuningsFontSize = this.settings.tuningsFontSize || defaultSettings.tuningsFontSize

    let text: GraphcisElement | undefined

    tuning.map((tuning, i) => {
      if (i < strings) {
        const tuningText = this.graphics.text(
          tuning,
          stringXPositions[i],
          y + padding,
          tuningsFontSize,
          color,
          fontFamily,
          Alignment.MIDDLE
        )

        if (tuning) {
          text = tuningText
        }
      }
    })

    if (text) {
      return y + text.height + padding * 2
    } else {
      return y
    }
  }

  private drawPosition(y: number): void {
    const position = this.settings.position || defaultSettings.position
    if (position <= 1) {
      return
    }

    const stringXPositions = this.stringXPos()
    const endX = stringXPositions[stringXPositions.length - 1]
    const startX = stringXPositions[0]
    const text = `${this.settings.position}fr`
    const size = this.settings.fretLabelFontSize || defaultSettings.fretLabelFontSize
    const color = this.settings.fretLabelColor || this.settings.color || defaultSettings.color
    const nutSize = this.stringSpacing() * (this.settings.nutSize || defaultSettings.nutSize)
    const fontFamily = this.settings.fontFamily || defaultSettings.fontFamily
    const fretLabelPosition = this.settings.fretLabelPosition || defaultSettings.fretLabelPosition

    // add some padding relative to the string spacing. Also make sure the padding is at least
    // 1/2 nutSize plus some padding to prevent the nut overlapping the position label.
    const padding = Math.max(this.stringSpacing() / 5, nutSize / 2 + 5)

    let textDoesNotFit = true

    const drawText = (sizeMultiplier = 1) => {
      if (sizeMultiplier < 0.01) {
        // text does not fit: don't render it at all.
        console.warn('Not enough space to draw the starting fret')
        return
      }

      if (fretLabelPosition === FretLabelPosition.RIGHT) {
        const svgText = this.graphics.text(
          text,
          endX + padding,
          y,
          size * sizeMultiplier,
          color,
          fontFamily,
          Alignment.LEFT
        )

        const { width, x } = svgText
        if (x + width > constants.width) {
          svgText.remove()
          drawText(sizeMultiplier * 0.9)
        }
      } else {
        const svgText = this.graphics.text(
          text,
          1 / sizeMultiplier + startX - padding,
          y,
          size * sizeMultiplier,
          color,
          fontFamily,
          Alignment.RIGHT
        )

        const { x } = svgText
        if (x < 0) {
          svgText.remove()
          drawText(sizeMultiplier * 0.8)
        }
      }
    }

    drawText()
  }

  /**
   * Hack to prevent the empty space of the svg from being cut off without having to define a
   * fixed width
   */
  private drawTopEdges() {
    this.graphics.circle(constants.width, 0, 0, 0, 'transparent', 'none')
    this.graphics.circle(0, 0, 0, 0, 'transparent', 'none')
  }

  private drawTopFret(y: number): number {
    const stringXpositions = this.stringXPos()
    const strokeWidth = this.settings.strokeWidth || defaultSettings.strokeWidth
    const topFretWidth = this.settings.topFretWidth || defaultSettings.topFretWidth
    const startX = stringXpositions[0] - strokeWidth / 2
    const endX = stringXpositions[stringXpositions.length - 1] + strokeWidth / 2
    const position = this.settings.position || defaultSettings.position
    const color = this.settings.fretColor || this.settings.color || defaultSettings.color

    let fretSize: number
    if (position > 1) {
      fretSize = strokeWidth
    } else {
      fretSize = topFretWidth
    }

    this.graphics.line(startX, y + fretSize / 2, endX, y + fretSize / 2, fretSize, color)

    return y + fretSize
  }

  private stringXPos(): number[] {
    const strings = this.settings.strings || defaultSettings.strings
    const sidePadding = this.settings.sidePadding || defaultSettings.sidePadding
    const startX = constants.width * sidePadding
    const stringsSpacing = this.stringSpacing()

    return range(strings).map(i => startX + stringsSpacing * i)
  }

  private stringSpacing(): number {
    const sidePadding = this.settings.sidePadding || defaultSettings.sidePadding
    const strings = this.settings.strings || defaultSettings.strings
    const startX = constants.width * sidePadding
    const endX = constants.width - startX
    const width = endX - startX

    return width / (strings - 1)
  }

  private fretSpacing(): number {
    const stringSpacing = this.stringSpacing()
    const fretSize = this.settings.fretSize || defaultSettings.fretSize

    return stringSpacing * fretSize
  }

  private fretLinesYPos(startY: number): number[] {
    const frets = this.settings.frets || defaultSettings.frets
    const fretSpacing = this.fretSpacing()

    return range(frets, 1).map(i => startY + fretSpacing * i)
  }

  private toArrayIndex(stringIndex: number): number {
    const strings = this.settings.strings || defaultSettings.strings

    return Math.abs(stringIndex - strings)
  }

  private drawEmptyStringIndicators(y: number): number {
    const stringXPositions = this.stringXPos()
    const stringSpacing = this.stringSpacing()
    const emptyStringIndicatorSize =
      this.settings.emptyStringIndicatorSize || defaultSettings.emptyStringIndicatorSize
    const size = emptyStringIndicatorSize * stringSpacing
    const padding = size / 3 // add some space above and below the indicator, relative to the indicator size
    const color = this.settings.color || defaultSettings.color
    const strokeWidth = this.settings.strokeWidth || defaultSettings.strokeWidth

    let hasEmpty = false

    const stroke = {
      color,
      width: strokeWidth
    }

    this._chord.fingers
      .filter(([_, value]) => value === SILENT || value === OPEN)
      .map<Finger>(([index, value]) => [this.toArrayIndex(index), value])
      .forEach(([stringIndex, value]) => {
        hasEmpty = true

        if (value === OPEN) {
          // draw an O
          this.graphics.circle(
            stringXPositions[stringIndex] - size / 2,
            y + padding,
            size,
            strokeWidth,
            color
          )
        } else {
          // draw an X
          const startX = stringXPositions[stringIndex] - size / 2
          const endX = startX + size
          const startY = y + padding
          const endY = startY + size

          this.graphics.line(startX, startY, endX, endY, strokeWidth, color)
          this.graphics.line(startX, endY, endX, startY, strokeWidth, color)
        }
      })

    return hasEmpty ? y + size + 2 * padding : y + padding
  }

  private drawGrid(y: number): number {
    const frets = this.settings.frets || defaultSettings.frets
    const fretSize = this.settings.fretSize || defaultSettings.fretSize
    const relativeNutSize = this.settings.nutSize || defaultSettings.nutSize
    const stringXPositions = this.stringXPos()
    const fretYPositions = this.fretLinesYPos(y)
    const stringSpacing = this.stringSpacing()
    const fretSpacing = stringSpacing * fretSize
    const height = fretSpacing * frets

    const startX = stringXPositions[0]
    const endX = stringXPositions[stringXPositions.length - 1]

    const nutSize = relativeNutSize * stringSpacing
    const nutColor = this.settings.nutColor || this.settings.color || defaultSettings.color
    const fretColor = this.settings.fretColor || this.settings.color || defaultSettings.color
    const stringColor = this.settings.stringColor || this.settings.color || defaultSettings.color
    const barreChordRadius = this.settings.barreChordRadius || defaultSettings.barreChordRadius
    const strokeWidth = this.settings.strokeWidth || defaultSettings.strokeWidth

    // draw frets
    fretYPositions.forEach(fretY => {
      this.graphics.line(startX, fretY, endX, fretY, strokeWidth, fretColor)
    })

    // draw strings
    stringXPositions.forEach(stringX => {
      this.graphics.line(stringX, y, stringX, y + height, strokeWidth, fretColor)
    })

    // draw fingers
    this._chord.fingers
      .filter(([_, value]) => value !== SILENT && value !== OPEN)
      .map(([stringIndex, fretIndex]) => [this.toArrayIndex(stringIndex), fretIndex as number])
      .forEach(([stringIndex, fretIndex]) => {
        this.graphics.circle(
          startX - nutSize / 2 + stringIndex * stringSpacing,
          y - fretSpacing / 2 - nutSize / 2 + fretIndex * fretSpacing,
          nutSize,
          0,
          nutColor,
          nutColor
        )
      })

    // draw barre chords
    this._chord.barres.forEach(({ fret, fromString, toString }) => {
      this.graphics.rect(
        stringXPositions[this.toArrayIndex(fromString)] - stringSpacing / 4,
        fretYPositions[fret - 1] - fretSpacing / 2 - nutSize / 2,
        Math.abs(toString - fromString) * stringSpacing + stringSpacing / 2,
        nutSize,
        0,
        nutColor,
        nutColor,
        nutSize * barreChordRadius
      )
    })

    return y + height
  }

  private drawTitle(size: number): number {
    const color = this.settings.color || defaultSettings.color
    const titleBottomMargin = this.settings.titleBottomMargin || defaultSettings.titleBottomMargin
    const fontFamily = this.settings.fontFamily || defaultSettings.fontFamily

    // draw the title
    const { x, y, width, height, remove } = this.graphics.text(
      this.settings.title || '',
      constants.width / 2,
      5,
      size,
      color,
      fontFamily,
      Alignment.MIDDLE
    )

    // check if the title fits. If not, try with a smaller size
    if (x < -0.0001) {
      remove()

      // try again with smaller font
      return this.drawTitle(size * (constants.width / width))
    }

    return y + height + titleBottomMargin
  }

  clear() {
    this.graphics.clear()
  }
}
