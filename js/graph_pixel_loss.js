function GraphPixelLoss(pixelNames, pixelsData, pixelMetrics) {
    this.pixelNames = pixelNames
    this.pixelsData = pixelsData
    this.pixelMetrics = pixelMetrics
    this.coordLoss = new GraphLoss()
}

GraphPixelLoss.prototype.Evaluate = function(realBox, predBox, coordName, pixelName = '') {
    let data = this.coordLoss.Evaluate(realBox, predBox, coordName)

    if (pixelName == '')
        return data

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