import { Alignment, GraphcisElement, Graphics } from './graphics'
import { Box, Container, QuerySelector, SVG } from '@svgdotjs/svg.js'
import { constants } from './constants'
import { isNode } from './utils'

export class SvgJsGraphics extends Graphics {
  private svg: Container

  constructor(container: QuerySelector | HTMLElement) {
    super(container)

    // initialize the SVG
    const width = constants.width
    const height = 0

    /*
    For some reason the container needs to be initiated differently with svgdom (node) and
    and in the browser. Might be a bug in either svg.js or svgdom. But this workaround works fine
    so I'm not going to care for now.
     */
    /* istanbul ignore else */
    if (isNode()) {
      // node (jest)
      this.svg = SVG(container) as Container
    } else {
      // browser
      this.svg = SVG().addTo(container)
    }

    this.svg.attr('preserveAspectRatio', 'xMidYMid meet').viewbox(0, 0, width, height)
  }

  line(fromX: number, fromY: number, toX: number, toY: number, strokeWidth: number, color: string) {
    this.svg.line(fromX, fromY, toX, toY).stroke({ color, width: strokeWidth })
  }

  size(width: number, height: number) {
    this.svg.viewbox(0, 0, width, height)
  }

  clear(): void {
    for (let child of this.svg.children()) {
      child.remove()
    }
  }

  text(
    text: string,
    x: number,
    y: number,
    fontSize: number,
    color: string,
    fontFamily: string,
    alignment: Alignment
  ) {
    const element = this.svg
      .text(text)
      .move(x, y)
      .font({
        family: fontFamily,
        size: fontSize,
        anchor: alignment
      })
      .fill(color)

    return this.boxToElement(element.bbox(), element.remove.bind(element))
  }

  circle(
    x: number,
    y: number,
    diameter: number,
    strokeWidth: number,
    strokeColor: string,
    fill?: string
  ): GraphcisElement {
    const element = this.svg
      .circle(diameter)
      .move(x, y)
      .fill(fill || 'none')
      .stroke({
        color: strokeColor,
        width: strokeWidth
      })

    return this.boxToElement(element.bbox(), element.remove.bind(element))
  }

  rect(
    x: number,
    y: number,
    width: number,
    height: number,
    strokeWidth: number,
    strokeColor: string,
    fill?: string,
    radius?: number
  ): GraphcisElement {
    const element = this.svg
      .rect(width, height)
      .move(x, y)
      .fill(fill || 'none')
      .stroke({
        width: strokeWidth,
        color: strokeColor
      })
      .radius(radius || 0)

    return this.boxToElement(element.bbox(), element.remove.bind(element))
  }

  private boxToElement(box: Box, remove: () => void): GraphcisElement {
    return {
      width: box.width,
      height: box.height,
      x: box.x,
      y: box.y,
      remove
    }
  }
}
