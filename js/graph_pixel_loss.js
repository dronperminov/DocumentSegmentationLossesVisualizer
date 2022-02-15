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
    let scale = 0

    if (pixelName.endsWith(' (champion)')) {
        pixelName = pixelName.replace(/ \(champion\)/g, '')
        scale += data.loss
    }

    if (this.pixelNames.indexOf(pixelName) > -1) {
        scale += this.pixelMetrics.Evaluate(info, pixelName)
    }
    else {
        throw "unkmown pixel loss '" + pixelName + "'"
    }

    data.loss *= scale
    data.dx1 *= scale
    data.dy1 *= scale
    data.dx2 *= scale
    data.dy2 *= scale

    return data
}