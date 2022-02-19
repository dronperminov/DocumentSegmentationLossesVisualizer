function PixelsData(ctx, image, width, height, threshold) {
    this.width = width
    this.height = height

    this.pixels = []
    this.mask = []

    ctx.drawImage(image, 0, 0, width, height)
    let data = ctx.getImageData(0, 0, width, height).data

    for (let i = 0; i < height; i++) {
        this.pixels[i] = []
        this.mask[i] = []

        for (let j = 0; j < width; j++) {
            this.pixels[i][j] = this.GetBrightness(data, (i * width + j) * 4)
            this.mask[i][j] = 0
        }
    }

    this.UpdateBlackMask(threshold)
}

PixelsData.prototype.GetBrightness = function(data, index) {
    return (data[index] + data[index + 1] + data[index + 2]) / 3
}

PixelsData.prototype.UpdateBlackMask = function(threshold) {
    this.mask[0][0] = this.pixels[0][0] < threshold ? 1 : 0

    for (let i = 1; i < this.height; i++)
        this.mask[i][0] = this.mask[i - 1][0] + (this.pixels[i][0] < threshold ? 1 : 0)
    
    for (let j = 1; j < this.width; j++)
        this.mask[0][j] = this.mask[0][j - 1] + (this.pixels[0][j] < threshold ? 1 : 0)

    for (let i = 1; i < this.height; i++)
        for (let j = 1; j < this.width; j++)
            this.mask[i][j] = this.mask[i - 1][j] + this.mask[i][j - 1] - this.mask[i - 1][j - 1] + (this.pixels[i][j] < threshold ? 1 : 0)
}

PixelsData.prototype.GetCountByCoords = function(x1, y1, x2, y2, isLess = true, isNormalized = false) {
    x1 = Math.max(0, x1)
    y1 = Math.max(0, y1)
    x2 = Math.min(this.width, x2)
    y2 = Math.min(this.height, y2)

    let k1 = this.mask[y2 - 1][x2 - 1]
    let k2 = x1 > 0 ? this.mask[y2 - 1][x1 - 1] : 0
    let k3 = y1 > 0 ? this.mask[y1 - 1][x2 - 1] : 0
    let k4 = x1 > 0 && y1 > 0 ? this.mask[y1 - 1][x1 - 1] : 0
    let count = k1 - k2 - k3 + k4
    let norm = isNormalized ? (x2 - x1) * (y2 - y1) : 1

    return (isLess ? count : (x2 - x1) * (y2 - y1) - count) / norm
}

PixelsData.prototype.GetCount = function(bbox, isLess = true, isNormalized = false) {
    return this.GetCountByCoords(bbox.x1, bbox.y1, bbox.x2, bbox.y2, isLess, isNormalized)
}