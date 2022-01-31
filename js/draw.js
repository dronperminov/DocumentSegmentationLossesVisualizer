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
    this.metrics.innerHTML = ''

    if (this.bboxes.length != 2)
        return

    let real = this.GetBoxesByColor(BBOX_REAL_COLOR)
    let pred = this.GetBoxesByColor(BBOX_PRED_COLOR)

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
    this.DrawLoss()

    if (this.CanVisualizeAreas() && this.visualizeLoss != 'none')
        this.VisualizeAreas()

    this.DrawBboxes()

    if (this.activeBox != null) {
        this.activeBox.Draw(this.ctx, true, this.visualizeLoss != 'none')
    }
}

Visualizer.prototype.PlotValues = function(data, values, minValue, maxValue,padding, color, index, steps, key) {
    data.ctx.font = '15px serif'
    data.ctx.textAlign = 'right'
    data.ctx.textBaseline = 'top'
    data.ctx.fillStyle = `hsl(${color}, 50%, 70%)`
    data.ctx.fillText(`${key} = ${this.Round(values[values.length - 1])} (${values.length} steps)`, data.width - padding, padding + index * 15)

    data.ctx.lineWidth = 2
    data.ctx.strokeStyle = `hsla(${color}, 50%, 70%, 70%)`
    data.ctx.beginPath()

    let xmin = padding
    let xmax = data.width - padding

    let ymin = data.height - padding
    let ymax = padding

    for (let i = 0; i < values.length; i++) {
        let x = steps > 0 ? xmin + (xmax - xmin) * i / steps : (xmin + xmax) / 2
        let y = ymin + (values[i] - minValue) / (maxValue - minValue) * (ymax - ymin)

        if (i == 0)
            data.ctx.moveTo(x, y)
        else
            data.ctx.lineTo(x, y)
    }

    data.ctx.stroke()
}

Visualizer.prototype.InitCanvas = function(canvas, padding, isCenterZero = false) {
    let width = canvas.clientWidth
    let height = canvas.clientHeight
    let y0 = isCenterZero ? height / 2 : height - padding

    canvas.width = width
    canvas.height = height

    let ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, width, height)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(padding, y0)
    ctx.lineTo(width - padding, y0)
    ctx.stroke()

    return {ctx, width, height }
}

Visualizer.prototype.PlotLosses = function(data, steps, maxLoss, maxGrad) {
    let padding = 10

    let gradNames = ['dx1', 'dy1', 'dx2', 'dy2']
    let lossesCtx = this.InitCanvas(this.lossesCanvas, padding)
    let gradCtxs = gradNames.map((gradName) => this.InitCanvas(this.gradCanvases[gradName], padding, true))

    let names = Object.keys(data)
    let sortedNames = names.slice().sort((a, b) => (data[a].lossValues.length - data[b].lossValues.length) + data[a].lossValues[data[a].lossValues.length - 1] - data[b].lossValues[data[b].lossValues.length - 1])

    for (let index = 0; index < sortedNames.length; index++) {
        let key = sortedNames[index]
        let color = data[key].color
        let iouType = data[key].iouType
        let loss = data[key].lossValues
        let grads = data[key].gradValues

        this.PlotValues(lossesCtx, loss, 0, Math.max(1, maxLoss), padding, color, index, steps, key)

        for (let i = 0; i < gradNames.length; i++)
            this.PlotValues(gradCtxs[i], grads[gradNames[i]], -maxGrad, maxGrad, padding, color, index, steps, key)
    }
}
