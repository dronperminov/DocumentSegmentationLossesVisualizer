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
            bbox.Draw(this.ctx, false, this.visualizeLoss != 'none')
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
    this.metrics.innerHTML += `<span class="box" style="background: ${this.LossToColor(iou)}"></span> <b>IoU</b>: ${this.Round(iou)}<br>`
    this.metrics.innerHTML += `<span class="box" style="background: ${this.LossToColor(piou)}"></span> <b>PIoU</b>: ${this.Round(piou)}<br>`
    this.metrics.innerHTML += `<span class="box" style="background: ${this.LossToColor(bwiou)}"></span> <b>BWIoU</b>: ${this.Round(bwiou)}<br>`
    this.metrics.innerHTML += `<span class="box" style="background: ${this.LossToColor(weighted_bwiou)}"></span> <b>BWIoU<sub>weighted</sub></b>: ${this.Round(weighted_bwiou)}<br>`
    this.metrics.innerHTML += '<hr>'

    this.metrics.innerHTML += '<i>Перемноженные с IoU функции потерь:</i><br>'
    this.metrics.innerHTML += `<span class="box" style="background: ${this.LossToColor(iou * piou)}"></span> IoU×PIoU: ${this.Round(iou * piou)}<br>`
    this.metrics.innerHTML += `<span class="box" style="background: ${this.LossToColor(iou * bwiou)}"></span> IoU×BWIoU: ${this.Round(iou * bwiou)}<br>`
    this.metrics.innerHTML += `<span class="box" style="background: ${this.LossToColor(iou * weighted_bwiou)}"></span> IoU×BWIoU<sub>weighted</sub>: ${this.Round(iou * weighted_bwiou)}<br>`
}

Visualizer.prototype.Map = function(x, in_min, in_max, out_min, out_max) {
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min
}

Visualizer.prototype.LossToColor = function(loss) {
    let color

    if (loss >= 0.95)
        color = this.Map(loss, 0.95, 1, 110, 120)
    else if (loss >= 0.8)
        color = this.Map(loss, 0.8, 0.95, 80, 110)
    else if (loss >= 0.5)
        color = this.Map(loss, 0.5, 0.8, 60, 80)
    else
        color = this.Map(loss, 0, 0.5, 0, 60)

    return `hsla(${color}, 80%, 50%, 70%)`
}

Visualizer.prototype.VisualizeAreas = function() {
    let pred = this.GetBoxesByColor(BBOX_PRED_COLOR)[0]
    let real = this.GetBoxesByColor(BBOX_REAL_COLOR)[0]
    let int = pred.Intersection(real)

    if (int == null)
        return

    let loss = 0

    if (this.visualizeLoss == 'iou') {
        loss = real.IoU(pred)
    }
    else if (this.visualizeLoss == 'piou') {
        loss = real.PIoU(pred, this.ctx)
    }
    else if (this.visualizeLoss == 'bwiou') {
        loss = real.BWIoU(pred, this.ctx)
    }
    else if (this.visualizeLoss == 'weighted-bwiou') {
        loss = real.WeightedBWIoU(pred, this.ctx)
    }
    else if (this.visualizeLoss == 'iou×piou') {
        loss = real.PIoU(pred, this.ctx) * real.IoU(pred)
    }
    else if (this.visualizeLoss == 'iou×bwiou') {
        loss = real.BWIoU(pred, this.ctx) * real.IoU(pred)
    }
    else if (this.visualizeLoss == 'iou×weighted-bwiou') {
        loss = real.WeightedBWIoU(pred, this.ctx) * real.IoU(pred)
    }

    this.ctx.fillStyle = this.LossToColor(loss)
    this.ctx.fillRect(int.x1, int.y1, int.x2 - int.x1, int.y2 - int.y1)

    this.ctx.fillStyle = `#000`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.font = '16px Arial'
    this.ctx.fillText(`${this.visualizeLoss} = ${this.Round(loss)}`, (int.x1 + int.x2) / 2, (int.y1 + int.y2) / 2)
}

Visualizer.prototype.Draw = function() {
    this.Clear()
    this.ctx.drawImage(this.image, 0, 0, this.imageWidth, this.imageHeight)

    if (this.needUpdate) {
        this.needUpdate = false
        this.DrawLoss()

    }

    if (this.CanVisualizeAreas() && this.visualizeLoss != 'none')
        this.VisualizeAreas()

    this.DrawBboxes()

    if (this.activeBox != null) {
        this.activeBox.Draw(this.ctx, true, this.visualizeLoss != 'none')
    }

    this.visualizeAreasBox.parentNode.style.display = this.CanVisualizeAreas() ? '' : 'none'
}
