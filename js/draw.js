Visualizer.prototype.Clear = function() {
    this.ctx.fillStyle = '#fff'
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.canvas.style.cursor = 'default'
    this.ctx.drawImage(this.image, 0, 0, this.imageWidth, this.imageHeight)
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
            bbox.Draw(this.ctx, false, this.visualizeLoss != 'none' || this.bboxes.length > 2)
        }

        if (bbox.IsMouseHover(this.currPoint.x, this.currPoint.y)) {
            this.UpdateCursor(bbox, this.currPoint.x, this.currPoint.y)
        }
    }
}

Visualizer.prototype.Round = function(v) {
    return Math.round(v * 10000) / 10000
}

Visualizer.prototype.MakeBoxesTable = function(real, pred) {
    let data = this.ctx.getImageData(0, 0, this.imageWidth, this.imageHeight).data
    let info = real.GetInfo(pred, data, this.threshold)

    let tableBoxes = `
        <tr><th>Bbox</th><th>Coord</th><th>Area</th><th>Black (■)</th><th>White (□)</th></tr>
        <tr>
            <td style="color: hsl(${BBOX_REAL_COLOR}, 70%, 50%)"><b>real</b></td>
            <td>${real.ToString()}</td>
            <td>${info.realArea}</td>
            <td>${this.Round(info.realBlackCount / info.realArea)} (${info.realBlackCount})</td>
            <td>${this.Round(info.realWhiteCount / info.realArea)} (${info.realWhiteCount})</td>
        </tr>
        <tr>
            <td style="color: hsl(${BBOX_PRED_COLOR}, 70%, 50%)"><b>pred</b></td>
            <td>${pred.ToString()}</td>
            <td>${info.predArea}</td>
            <td>${this.Round(info.predBlackCount / info.predArea)} (${info.predBlackCount})</td>
            <td>${this.Round(info.predWhiteCount / info.predArea)} (${info.predWhiteCount})</td>
        </tr>`

    let tableIntersection = ''

    if (info.haveIntersection) {
        tableIntersection = `
            <tr>
                <td><b>∩</b></td>
                <td>${info.intersection.ToString()}</td>
                <td>${info.intersectionArea}</td>
                <td>${this.Round(info.intersectionBlackCount / info.intersectionArea)} (${info.intersectionBlackCount})</td>
                <td>${this.Round(info.intersectionWhiteCount / info.intersectionArea)} (${info.intersectionWhiteCount})</td>
            </tr>
            <tr>
                <td><b>∪</b></td>
                <td></td>
                <td>${info.unionArea}</td>
                <td>${this.Round(info.unionBlackCount / info.unionArea)} (${info.unionBlackCount})</td>
                <td>${this.Round(info.unionWhiteCount / info.unionArea)} (${info.unionWhiteCount})</td>
            </tr>`
    }

    this.metrics.innerHTML += `<table>${tableBoxes}${tableIntersection}</table><hr>`
}

Visualizer.prototype.MakeIouTable = function(real, pred) {
    let ious = this.iouTypes.map((iouType) => real.IoU(pred, iouType))
    let losses = this.iouTypes.map((iouType) => this.iou.Evaluate(real, pred, 1, iouType))

    let header = `<tr><th>Тип</th>${this.iouTypes.map((iouType) => '<th>' + iouType + '</th>').join('')}</tr>`
    let direct = `<tr><td>L</td>${ious.map((iou) => '<td><span class="box" style="background: ' + this.LossToColor(iou) + '"></span> ' + this.Round(iou) + '</td>').join('')}</tr>`
    let inverse = `<tr><td>1 - L</td>${ious.map((iou) => '<td><span class="box" style="background: ' + this.LossToColor(1 - iou) + '"></span> ' + this.Round(1 -iou) + '</td>').join('')}</tr>`
    let dx1 = `<tr><td>∂L/∂x<sub>1</sub></td>${losses.map((v) => '<td>' + this.Round(v.dx1) + '</td>').join('')}</tr>`
    let dy1 = `<tr><td>∂L/∂y<sub>1</sub></td>${losses.map((v) => '<td>' + this.Round(v.dy1) + '</td>').join('')}</tr>`
    let dx2 = `<tr><td>∂L/∂x<sub>2</sub></td>${losses.map((v) => '<td>' + this.Round(v.dx2) + '</td>').join('')}</tr>`
    let dy2 = `<tr><td>∂L/∂y<sub>2</sub></td>${losses.map((v) => '<td>' + this.Round(v.dy2) + '</td>').join('')}</tr>`

    this.metrics.innerHTML += '<i>Значения различных видов IoU</i>'
    this.metrics.innerHTML += `<table>${header}${direct}${inverse}${dx1}${dy1}${dx2}${dy2}</table>`
}

Visualizer.prototype.MakeLossTable = function(real, pred) {
    let losses = this.GetLosses(real, pred)
    let baseLosses = ['PIoU', 'BWIoU', 'Weighted BWIoU']

    let modifications = [
        { name: 'L', value: function(loss) { return loss }, need: () => true },
        { name: `L × ${this.iouBox.value}`, value: function(loss) { return loss * losses.iou }, need: () => true },
        { name: `(L + 1 - IoU) × ${this.iouBox.value}<br>(champion)`, value: function(loss) { return (loss + 1 - losses.iou_clear) * losses.iou }, need: () => true },
        { name: `(L + 1 - ${this.iouBox.value}) × ${this.iouBox.value}<br>(champion 2)`, value: function(loss) { return (loss + 1 - losses.iou) * losses.iou }, need: () => this.iouBox.value != 'IoU' },
    ]

    let header = `<tr><th>Тип</th>${baseLosses.map((loss) => '<th>' + loss + '</th>').join('')}</tr>`
    let values = []

    for (let mod of modifications) {
        if (!mod.need())
            continue

        let row = `<tr><td>${mod.name}</td>`

        for (let loss of baseLosses) {
            let name = loss.toLowerCase().replace(/ /gi, '_')
            let value = mod.value(losses[name])
            row += `<td><span class="box" style="background: ${this.LossToColor(value)}"></span> ${this.Round(value)}</td>`
        }

        values.push(row + `</tr>`)
    }

    this.metrics.innerHTML += '<hr><i>Функции потерь:</i><br>'
    this.metrics.innerHTML += `<table>${header}${values.join('\n')}</table>`
}

Visualizer.prototype.DrawLoss = function() {
    let real = this.GetBoxesByColor(BBOX_REAL_COLOR)
    let pred = this.GetBoxesByColor(BBOX_PRED_COLOR)

    this.metrics.innerHTML = ''

    if (real.length != 1 || pred.length != 1)
        return

    real = real[0]
    pred = pred[0]

    this.MakeBoxesTable(real, pred)
    this.MakeIouTable(real, pred)
    this.MakeLossTable(real, pred)
}

Visualizer.prototype.Map = function(x, in_min, in_max, out_min, out_max) {
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min
}

Visualizer.prototype.LossToColor = function(loss) {
    let color

    if (loss >= 0.9)
        color = this.Map(loss, 0.9, 1, 90, 120)
    else if (loss >= 0.5)
        color = this.Map(loss, 0.5, 0.9, 60, 90)
    else
        color = this.Map(loss, 0, 0.5, 0, 60)

    return `hsla(${color}, 80%, 50%, 70%)`
}

Visualizer.prototype.VisualizeAreas = function() {
    let real = this.GetBoxesByColor(BBOX_REAL_COLOR)[0]
    let pred = this.GetBoxesByColor(BBOX_PRED_COLOR)[0]
    let int = pred.Intersection(real)

    if (int == null)
        return

    let loss = this.GetLossByName(real, pred, this.visualizeLoss)

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
}

Visualizer.prototype.PlotLosses = function(data, steps, maxLoss) {
    let padding = 1
    let width = this.lossesCanvas.width
    let height = this.lossesCanvas.height

    this.lossesCtx.clearRect(0, 0, width, height)
    this.lossesCtx.strokeStyle = '#000'
    this.lossesCtx.lineWidth = 1
    this.lossesCtx.beginPath()
    this.lossesCtx.moveTo(padding, padding)
    this.lossesCtx.lineTo(padding, height - padding)
    this.lossesCtx.lineTo(width - padding, height - padding)
    this.lossesCtx.stroke()

    let xmin = padding
    let xmax = width - padding

    let ymin = height - padding
    let ymax = padding

    let names = Object.keys(data)
    let sortedNames = names.slice().sort((a, b) => (data[a].lossValues.length - data[b].lossValues.length) + data[a].lossValues[data[a].lossValues.length - 1] - data[b].lossValues[data[b].lossValues.length - 1])

    for (let index = 0; index < sortedNames.length; index++) {
        let key = sortedNames[index]
        let color = data[key].color
        let iouType = data[key].iouType
        let loss = data[key].lossValues

        this.lossesCtx.font = '15px serif'
        this.lossesCtx.textAlign = 'right'
        this.lossesCtx.textBaseline = 'top'
        this.lossesCtx.fillStyle = `hsl(${color}, 50%, 70%)`
        this.lossesCtx.fillText(`${key} = ${this.Round(loss[loss.length - 1])} (${loss.length} steps)`, width - padding, padding + index * 15)

        this.lossesCtx.lineWidth = 2
        this.lossesCtx.strokeStyle = `hsla(${color}, 50%, 70%, 70%)`
        this.lossesCtx.beginPath()

        for (let i = 0; i < steps; i++) {
            let x = steps > 0 ? xmin + (xmax - xmin) * i / steps : (xmax + xmin) / 2
            let y = ymin + loss[i] / Math.max(1, maxLoss) * (ymax - ymin)

            if (i == 0)
                this.lossesCtx.moveTo(x, y)
            else
                this.lossesCtx.lineTo(x, y)
        }

        this.lossesCtx.stroke()
    }
}
