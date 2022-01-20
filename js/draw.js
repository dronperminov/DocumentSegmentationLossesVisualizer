Visualizer.prototype.Clear = function() {
    this.ctx.fillStyle = '#fff'
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.canvas.style.cursor = 'default'
}

Visualizer.prototype.UpdateCursor = function(bbox, x, y) {
    if (bbox.IsResize(x, y)) {
        this.canvas.style.cursor = bbox.GetResizeDir(x, y) + '-resize'
    }
    else {
        this.canvas.style.cursor = 'pointer'
    }
}

Visualizer.prototype.DrawBboxes = function() {
    for (let bbox of this.bboxes) {
        if (bbox != this.activeBox) {
            bbox.Draw(this.ctx)
        }

        if (bbox.IsMouseHover(this.currPoint.x, this.currPoint.y)) {
            this.UpdateCursor(bbox, this.currPoint.x, this.currPoint.y)
        }
    }
}

Visualizer.prototype.Round = function(v) {
    return Math.round(v * 10000) / 10000
}

Visualizer.prototype.DrawLoss = function() {
    let real = this.GetBoxesByColor(BBOX_REAL_COLOR)
    let pred = this.GetBoxesByColor(BBOX_PRED_COLOR)

    this.metrics.innerHTML = ''

    if (real.length != 1 || pred.length != 1)
        return

    let info = real[0].GetInfo(pred[0], this.ctx)

    if (info != null) {
        this.metrics.innerHTML += `<i>Площади выделенных bounding box'ов:</i><br>`
        this.metrics.innerHTML += `<b>S</b><sub>real</sub>: ${info.realArea}<br>`
        this.metrics.innerHTML += `<b>S</b><sub>pred</sub>: ${info.predArea}<br>`
        this.metrics.innerHTML += `<b>S</b><sub>∩</sub>: ${info.intersectionArea}<br>`
        this.metrics.innerHTML += `<b>S</b><sub>∪</sub>: ${info.unionArea}<br>`
        this.metrics.innerHTML += '<hr>'

        this.metrics.innerHTML += `<i>Значения тёмных пикселей, нормализованные к своим площадям</i><br>`
        this.metrics.innerHTML += `<b>Black</b><sub>real</sub>: ${this.Round(info.realBlackCount / info.realArea)} (${info.realBlackCount})<br>`
        this.metrics.innerHTML += `<b>Black</b><sub>pred</sub>: ${this.Round(info.predBlackCount / info.predArea)} (${info.predBlackCount})<br>`
        this.metrics.innerHTML += `<b>Black</b><sub>∩</sub>: ${this.Round(info.intersectionBlackCount / info.intersectionArea)} (${info.intersectionBlackCount})<br>`
        this.metrics.innerHTML += `<b>Black</b><sub>∪</sub>: ${this.Round(info.unionBlackCount / info.unionArea)} (${info.unionBlackCount})<br>`
        this.metrics.innerHTML += '<hr>'

        this.metrics.innerHTML += `<i>Значения светлых пикселей, нормализованные к своим площадям</i><br>`
        this.metrics.innerHTML += `<b>White</b><sub>real</sub>: ${this.Round(info.realWhiteCount / info.realArea)} (${info.realWhiteCount})<br>`
        this.metrics.innerHTML += `<b>White</b><sub>pred</sub>: ${this.Round(info.predWhiteCount / info.predArea)} (${info.predWhiteCount})<br>`
        this.metrics.innerHTML += `<b>White</b><sub>∩</sub>: ${this.Round(info.intersectionWhiteCount / info.intersectionArea)} (${info.intersectionWhiteCount})<br>`
        this.metrics.innerHTML += `<b>White</b><sub>∪</sub>: ${this.Round(info.unionWhiteCount / info.unionArea)} (${info.unionWhiteCount})<br>`
        this.metrics.innerHTML += '<hr>'
    }

    let iou = real[0].IoU(pred[0])
    let piou = real[0].PIoU(pred[0], this.ctx)
    let bwiou = real[0].BWIoU(pred[0], this.ctx)
    let weighted_bwiou = real[0].WeightedBWIoU(pred[0], this.ctx)

    this.metrics.innerHTML += '<i>Функции потерь:</i><br>'
    this.metrics.innerHTML += '<b>IoU</b>: ' + this.Round(iou) + '<br>'
    this.metrics.innerHTML += '<b>PIoU</b>: ' + this.Round(piou) + '<br>'
    this.metrics.innerHTML += '<b>BWIoU</b>: ' + this.Round(bwiou) + '<br>'
    this.metrics.innerHTML += '<b>BWIoU<sub>weighted</sub></b>: ' + this.Round(weighted_bwiou) + '<br>'
    this.metrics.innerHTML += '<hr>'

    this.metrics.innerHTML += '<i>Перемноженные с IoU функции потерь:</i><br>'
    this.metrics.innerHTML += 'IOU×PIoU: ' + this.Round(iou * piou) + '<br>'
    this.metrics.innerHTML += 'IOU×BWIoU: ' + this.Round(iou * bwiou) + '<br>'
    this.metrics.innerHTML += 'IOU×BWIoU<sub>weighted</sub>: ' + this.Round(iou * weighted_bwiou) + '<br>'
}

Visualizer.prototype.Draw = function() {
    this.Clear()
    this.ctx.drawImage(this.image, 0, 0, this.imageWidth, this.imageHeight)

    if (this.needUpdate) {       
        this.needUpdate = false
        this.DrawLoss()
    }

    this.DrawBboxes()

    if (this.activeBox != null) {
        this.activeBox.Draw(this.ctx, true)
    }
}
