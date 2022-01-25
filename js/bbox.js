function BoundingBox(x1, y1, x2, y2, color, isCreated = false) {
    this.x1 = x1
    this.y1 = y1
    this.x2 = x2
    this.y2 = y2
    this.color = color // hsv angle

    this.isCreated = isCreated
}

BoundingBox.prototype.Move = function(dx, dy) {
    if (this.isCreated) {
        this.x1 += dx
        this.y1 += dy
    }

    this.x2 += dx
    this.y2 += dy
}

BoundingBox.prototype.Resize = function(dir, dx, dy) {
    if (dir.endsWith('w')) {
        this.x1 += dx
    }

    if (dir.endsWith('e')) {
        this.x2 += dx
    }

    if (dir.startsWith('n')) {
        this.y1 += dy
    }

    if (dir.startsWith('s')) {
        this.y2 += dy
    }
}

BoundingBox.prototype.Create = function() {
    this.isCreated = true
}

BoundingBox.prototype.Normalize = function() {
    let bbox = this.GetNormalParams()
    this.x1 = bbox.x1
    this.y1 = bbox.y1
    this.x2 = bbox.x2
    this.y2 = bbox.y2
}

BoundingBox.prototype.IsNormal = function() {
    let width = Math.abs(this.x2 - this.x1)
    let height = Math.abs(this.y2 - this.y1)

    return width >= MIN_BBOX_WIDTH && height >= MIN_BBOX_HEIGHT
}

BoundingBox.prototype.IsCreated = function() {
    return this.isCreated
}

BoundingBox.prototype.GetNormalParams = function() {
    let x1 = Math.min(this.x1, this.x2)
    let x2 = Math.max(this.x1, this.x2)

    let y1 = Math.min(this.y1, this.y2)
    let y2 = Math.max(this.y1, this.y2)

    return { x1: x1, y1: y1, x2: x2, y2: y2 }
}

BoundingBox.prototype.IsMouseHover = function(x, y) {
    let bbox = this.GetNormalParams()
    return bbox.x1 - BBOX_RESIZE_DELTA <= x && x <= bbox.x2 + BBOX_RESIZE_DELTA && bbox.y1 - BBOX_RESIZE_DELTA <= y && y <= bbox.y2 + BBOX_RESIZE_DELTA
}

BoundingBox.prototype.IsResize = function(x, y) {
    if (!this.isCreated)
        return false

    let bbox = this.GetNormalParams()
    return bbox.x1 + BBOX_RESIZE_DELTA > x || x > bbox.x2 - BBOX_RESIZE_DELTA || bbox.y1 + BBOX_RESIZE_DELTA > y || y > bbox.y2 - BBOX_RESIZE_DELTA
}

BoundingBox.prototype.GetResizeDir = function(x, y) {
    let dirs = []
    let bbox = this.GetNormalParams()

    if (Math.abs(y - bbox.y1) < BBOX_RESIZE_DELTA)
        dirs.push('n')

    if (Math.abs(y - bbox.y2) < BBOX_RESIZE_DELTA)
        dirs.push('s')

    if (Math.abs(x - bbox.x1) < BBOX_RESIZE_DELTA)
        dirs.push('w')

    if (Math.abs(x - bbox.x2) < BBOX_RESIZE_DELTA)
        dirs.push('e')

    return dirs.join('')
}

BoundingBox.prototype.ToString = function() {
    return `${this.x1}, ${this.y1}, ${this.x2}, ${this.y2}`
}

BoundingBox.prototype.Draw = function(ctx, isActive = false, onlyBorder = false) {
    let bbox = this.GetNormalParams()
    let width = Math.abs(this.x2 - this.x1)
    let height = Math.abs(this.y2 - this.y1)

    ctx.fillStyle = `hsl(${this.color}, 50%, 80%, 50%)`
    ctx.strokeStyle = `hsl(${this.color}, 80%, 60%)`
    ctx.lineWidth = 2

    if (!isActive && !onlyBorder) {
        ctx.setLineDash([3, 3])
    }

    ctx.beginPath()
    ctx.rect(bbox.x1, bbox.y1, width, height)

    if (!onlyBorder) {
        ctx.fill()
    }

    ctx.stroke()
    
    ctx.setLineDash([])
}

BoundingBox.prototype.GetArea = function() {
    return Math.abs(this.x2 - this.x1) * Math.abs(this.y2 - this.y1)
}

BoundingBox.prototype.Intersection = function(bbox) {
    let bbox1 = this.GetNormalParams()
    let bbox2 = bbox.GetNormalParams()

    let x1 = Math.max(bbox1.x1, bbox2.x1)
    let x2 = Math.min(bbox1.x2, bbox2.x2)

    let y1 = Math.max(bbox1.y1, bbox2.y1)
    let y2 = Math.min(bbox1.y2, bbox2.y2)

    if (x2 < x1 || y2 < y1)
        return null

    return new BoundingBox(x1, y1, x2, y2, (this.color + bbox.color) / 2)
}

BoundingBox.prototype.CountByThreshold = function(pixels, threshold = 120, isLess = true) {
    let count = 0

    for (let i = 0; i < pixels.length; i += 4) {
        let r = pixels[i + 0]
        let g = pixels[i + 1]
        let b = pixels[i + 2]
        let brightness = (r + g + b) / 3 // stupid, i know

        if (brightness < threshold && isLess)
            count++
        else if (brightness >= threshold && !isLess)
            count++
    }

    return count
}

BoundingBox.prototype.GetInfo = function(bbox, ctx, threshold) {
    let intersection = this.Intersection(bbox)

    if (intersection == null || intersection.GetArea() <= 1)
        return null

    let realArea = this.GetArea()
    let predArea = bbox.GetArea()
    let intersectionArea = intersection.GetArea()
    let unionArea = realArea + predArea - intersectionArea

    let realPixels = this.GetPixels(ctx)
    let predPixels = bbox.GetPixels(ctx)
    let intersectionPixels = intersection.GetPixels(ctx)

    let realBlackCount = this.CountByThreshold(realPixels, threshold, true)
    let predBlackCount = this.CountByThreshold(predPixels, threshold, true)
    let intersectionBlackCount = this.CountByThreshold(intersectionPixels, threshold, true)
    let unionBlackCount = realBlackCount + predBlackCount - intersectionBlackCount

    let realWhiteCount = this.CountByThreshold(realPixels, threshold, false)
    let predWhiteCount = this.CountByThreshold(predPixels, threshold, false)
    let intersectionWhiteCount = this.CountByThreshold(intersectionPixels, threshold, false)
    let unionWhiteCount = realWhiteCount + predWhiteCount - intersectionWhiteCount

    return {
        realArea,
        predArea,
        intersectionArea,
        unionArea,

        realBlackCount,
        predBlackCount,
        intersectionBlackCount,
        unionBlackCount,

        realWhiteCount,
        predWhiteCount,
        intersectionWhiteCount,
        unionWhiteCount
    }
}

BoundingBox.prototype.IoU = function(bbox, DIoU = false, CIoU = false) {
    let intersection = this.Intersection(bbox)

    let area1 = this.GetArea()
    let area2 = bbox.GetArea()
    let intersectionArea = intersection == null ? 0 : intersection.GetArea()
    let unionArea = area1 + area2 - intersectionArea

    let iou = intersectionArea / unionArea

    if (DIoU || CIoU) {
        let cw = Math.max(this.x2, bbox.x2) - Math.min(this.x1, bbox.x1)
        let ch = Math.max(this.y2, bbox.y2) - Math.min(this.y1, bbox.y1)
        let c2 = cw*cw + ch*ch
        let rho2 = (Math.pow(this.x1 + this.x2 - bbox.x1 - bbox.x2, 2) + Math.pow(this.y1 + this.y2 - bbox.y1 - bbox.y2, 2)) / 4

        if (CIoU) {
            let w1 = Math.abs(this.x2 - this.x1)
            let h1 = Math.abs(this.y2 - this.y1)

            let w2 = Math.abs(bbox.x2 - bbox.x1)
            let h2 = Math.abs(bbox.y2 - bbox.y1)

            let v = 4 / (Math.PI * Math.PI) * Math.pow(Math.atan(w2 / h2) - Math.atan(w1 / h1), 2)
            let alpha = v / (v - iou + 1 + 1e-8)

            return iou - (rho2 / c2 + v * alpha)
        }
        else {
            return iou - rho2 / c2
        }
    }

    return iou
}

BoundingBox.prototype.PIoU = function(bbox, ctx, threshold) {
    let info = this.GetInfo(bbox, ctx, threshold)

    if (info == null || info.intersectionBlackCount == 0)
        return 0

    return info.intersectionBlackCount / info.unionBlackCount
}

BoundingBox.prototype.BWIoU = function(bbox, ctx, threshold) {
    let info = this.GetInfo(bbox, ctx, threshold)

    if (info == null)
        return 0

    let w = 0.7
    let lambda = 10

    let int = info.intersectionBlackCount * w + info.intersectionWhiteCount * (1 - w)
    let union = info.unionBlackCount * w + info.unionWhiteCount * (1 - w)

    return int / (union + (info.unionBlackCount - info.intersectionBlackCount) * lambda)
}

BoundingBox.prototype.WeightedBWIoU = function(bbox, ctx, threshold) {
    let info = this.GetInfo(bbox, ctx, threshold)

    if (info == null)
        return 0

    let intW = info.intersectionWhiteCount / info.intersectionArea
    let unionW = info.unionWhiteCount / info.unionArea

    let lambda = 10

    let int = info.intersectionBlackCount * intW + info.intersectionWhiteCount * (1 - intW)
    let union = info.unionBlackCount * unionW + info.unionWhiteCount * (1 - unionW)

    return int / (union + (info.unionBlackCount - info.intersectionBlackCount) * lambda)
}

BoundingBox.prototype.GetPixels = function(ctx) {
    return ctx.getImageData(this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1).data
}
