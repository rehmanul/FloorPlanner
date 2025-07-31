import { Point, Rectangle } from "@shared/schema";

export class GeometricUtils {
  
  rectanglesOverlap(rect1: Rectangle, rect2: Rectangle, buffer: number = 0): boolean {
    return !(
      rect1.x + rect1.width + buffer < rect2.x || 
      rect2.x + rect2.width + buffer < rect1.x || 
      rect1.y + rect1.height + buffer < rect2.y || 
      rect2.y + rect2.height + buffer < rect1.y
    );
  }

  distanceFromPointToRectangle(point: Point, rect: Rectangle): number {
    const dx = Math.max(0, Math.max(rect.x - point.x, point.x - (rect.x + rect.width)));
    const dy = Math.max(0, Math.max(rect.y - point.y, point.y - (rect.y + rect.height)));
    return Math.sqrt(dx * dx + dy * dy);
  }

  distanceBetweenPoints(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  pointInRectangle(point: Point, rect: Rectangle): boolean {
    return point.x >= rect.x && 
           point.x <= rect.x + rect.width && 
           point.y >= rect.y && 
           point.y <= rect.y + rect.height;
  }

  lineIntersection(
    line1Start: Point, 
    line1End: Point, 
    line2Start: Point, 
    line2End: Point
  ): Point | null {
    const x1 = line1Start.x, y1 = line1Start.y;
    const x2 = line1End.x, y2 = line1End.y;
    const x3 = line2Start.x, y3 = line2Start.y;
    const x4 = line2End.x, y4 = line2End.y;

    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    
    if (Math.abs(denominator) < 1e-10) {
      return null; // Lines are parallel
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
      };
    }

    return null; // No intersection within line segments
  }

  rectangleArea(rect: Rectangle): number {
    return rect.width * rect.height;
  }

  rectanglePerimeter(rect: Rectangle): number {
    return 2 * (rect.width + rect.height);
  }

  rectangleCenter(rect: Rectangle): Point {
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2
    };
  }

  expandRectangle(rect: Rectangle, margin: number): Rectangle {
    return {
      x: rect.x - margin,
      y: rect.y - margin,
      width: rect.width + 2 * margin,
      height: rect.height + 2 * margin
    };
  }

  mergeRectangles(rect1: Rectangle, rect2: Rectangle): Rectangle {
    const minX = Math.min(rect1.x, rect2.x);
    const minY = Math.min(rect1.y, rect2.y);
    const maxX = Math.max(rect1.x + rect1.width, rect2.x + rect2.width);
    const maxY = Math.max(rect1.y + rect1.height, rect2.y + rect2.height);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  // Convert screen coordinates to world coordinates
  screenToWorld(screenPoint: Point, scale: number, offset: Point): Point {
    return {
      x: (screenPoint.x - offset.x) / scale,
      y: (screenPoint.y - offset.y) / scale
    };
  }

  // Convert world coordinates to screen coordinates
  worldToScreen(worldPoint: Point, scale: number, offset: Point): Point {
    return {
      x: worldPoint.x * scale + offset.x,
      y: worldPoint.y * scale + offset.y
    };
  }

  // Calculate optimal viewport for floor plan
  calculateOptimalViewport(bounds: Rectangle, canvasWidth: number, canvasHeight: number): {
    scale: number;
    offset: Point;
  } {
    const margin = 50; // Margin in pixels
    const availableWidth = canvasWidth - 2 * margin;
    const availableHeight = canvasHeight - 2 * margin;

    const scaleX = availableWidth / bounds.width;
    const scaleY = availableHeight / bounds.height;
    const scale = Math.min(scaleX, scaleY);

    const offset = {
      x: (canvasWidth - bounds.width * scale) / 2 - bounds.x * scale,
      y: (canvasHeight - bounds.height * scale) / 2 - bounds.y * scale
    };

    return { scale, offset };
  }
}
