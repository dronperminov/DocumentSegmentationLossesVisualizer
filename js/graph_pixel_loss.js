function GraphPixelLoss(pixelNames, pixelsData, pixelMetrics) {
    this.pixelNames = pixelNames
    this.pixelsData = pixelsData
    this.pixelMetrics = pixelMetrics
    this.coordLoss = new GraphLoss()
}

GraphPixelLoss.prototype.EvalArea = function(x1, y1, x2, y2) {
    return this.pixelsData.GetCountByCoords(x1, y1, x2, y2, true)
}

GraphPixelLoss.prototype.PixelLoss = function(data, predBox) {
    let areaOffset = 10 // 10 пикселей для каждой из сторон

    let area = this.EvalArea(predBox.x1, predBox.y1, predBox.x2, predBox.y2) * 0.05

    let x1_left = this.EvalArea(predBox.x1 - areaOffset, predBox.y1, predBox.x2, predBox.y2)
    let x1_right = this.EvalArea(predBox.x1 + areaOffset, predBox.y1, predBox.x2, predBox.y2)
    let dx1 = (x1_left - x1_right) / area

    let x2_left = this.EvalArea(predBox.x1, predBox.y1, predBox.x2 - areaOffset, predBox.y2)
    let x2_right = this.EvalArea(predBox.x1, predBox.y1, predBox.x2 + areaOffset, predBox.y2)
    let dx2 = (x2_left - x2_right) / area

    let y1_top = this.EvalArea(predBox.x1, predBox.y1 - areaOffset, predBox.x2, predBox.y2)
    let y1_bottom = this.EvalArea(predBox.x1, predBox.y1 + areaOffset, predBox.x2, predBox.y2)
    let dy1 = (y1_top - y1_bottom) / area

    let y2_top = this.EvalArea(predBox.x1, predBox.y1, predBox.x2, predBox.y2 - areaOffset)
    let y2_bottom = this.EvalArea(predBox.x1, predBox.y1, predBox.x2, predBox.y2 + areaOffset)
    let dy2 = (y2_top - y2_bottom) / area

    data.dx1 += dx1
    data.dy1 += dy1
    data.dx2 += dx2
    data.dy2 += dy2

    return data
}

GraphPixelLoss.prototype.Evaluate = function(realBox, predBox, coordName, pixelName = '') {
    let data = this.coordLoss.Evaluate(realBox, predBox, coordName)

    if (pixelName == '')
        return data

    if (pixelName == 'Pixel')
        return this.PixelLoss(data, predBox)

    let info = realBox.GetInfo(predBox, this.pixelsData)
    let scale

    if (pixelName.endsWith(' (champion)')) {
        scale = this.pixelMetrics.Evaluate(info, pixelName.replace(/ \(champion\)/g, '')) + data.loss // F + (1 - M) = F + L
    }
    else {
        scale = this.pixelMetrics.Evaluate(info, pixelName)
    }

    data.loss = 1 - (1 - data.loss) * scale
    data.dx1 *= scale
    data.dy1 *= scale
    data.dx2 *= scale
    data.dy2 *= scale

    return data
}