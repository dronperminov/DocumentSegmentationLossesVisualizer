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

Visualizer.prototype.DrawLine = function(ctx, x1, y1, x2, y2, color, lineWidth = 1) {
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
}

Visualizer.prototype.DrawTextLine = function(x1, y1, x2, y2, text, color, t = 0.5, font_size = 14) {
    this.DrawLine(this.ctx, x1, y1, x2, y2, color)

    this.ctx.save()
    this.ctx.translate(x1 + t * (x2 - x1), y1 + t * (y2 - y1))
    this.ctx.rotate(Math.atan2(y2 - y1, x2 - x1))
    this.ctx.font = font_size + 'px serif'
    this.ctx.textAlign = "center"
    this.ctx.textBaseline = "bottom"
    this.ctx.fillStyle = color
    this.ctx.fillText(text, 0, 0)
    this.ctx.restore()
}

Visualizer.prototype.DrawBboxes = function() {
    for (let bbox of this.bboxes) {
        if (bbox != this.activeBox) {
            bbox.Draw(this.ctx, false, this.bboxes.length > 2)
        }

        if (bbox.IsMouseHover(this.currPoint.x, this.currPoint.y)) {
            this.UpdateCursor(bbox, this.currPoint.x, this.currPoint.y)
        }
    }

    if (this.activeBox != null) {
        this.activeBox.Draw(this.ctx, true)
    }
}

Visualizer.prototype.DrawBboxesInfo = function() {
    if (this.bboxes.length != 2)
        return

    let reals = this.GetBoxesByColor(BBOX_REAL_COLOR)
    let preds = this.GetBoxesByColor(BBOX_PRED_COLOR)

    if (reals.length != 1 || preds.length != 1)
        return

    let real = reals[0]
    let pred = preds[0]

    let convex = real.Convex(pred)
    let int = real.Intersection(pred, true)

    let real_cx = (real.x1 + real.x2) / 2
    let real_cy = (real.y1 + real.y2) / 2

    let pred_cx = (pred.x1 + pred.x2) / 2
    let pred_cy = (pred.y1 + pred.y2) / 2

    let center_dx = Math.pow(real.nx1 + real.nx2 - pred.nx1 - pred.nx2, 2)
    let center_dy = Math.pow(real.ny1 + real.ny2 - pred.ny1 - pred.ny2, 2)
    let center_dst = (center_dx + center_dy) / 4

    this.DrawTextLine(convex.x1, convex.y2, convex.x2, convex.y1, `${this.Round(Math.pow(convex.nx2 - convex.nx1, 2) + Math.pow(convex.ny2 - convex.ny1, 2))}`, 'hsl(240, 50%, 40%)')
    this.DrawTextLine(convex.x1, convex.y1, convex.x1, convex.y2, `${this.Round(convex.ny2 - convex.ny1)}`, 'hsl(240, 50%, 40%)')
    this.DrawTextLine(convex.x1, convex.y1, convex.x2, convex.y1, `${this.Round(convex.nx2 - convex.nx1)}`, 'hsl(240, 50%, 40%)')

    this.DrawTextLine(int.x1, int.y2, int.x2, int.y1, `${this.Round(Math.pow(int.nx2 - int.nx1, 2) + Math.pow(int.ny2 - int.ny1, 2))}`, 'hsl(300, 50%, 40%)')
    this.DrawTextLine(int.x1, int.y1, int.x2, int.y1, `${this.Round(int.nx2 - int.nx1)}`, 'hsl(300, 50%, 40%)')
    this.DrawTextLine(int.x1, int.y1, int.x1, int.y2, `${this.Round(int.ny2 -int.ny1)}`, 'hsl(300, 50%, 40%)')

    this.DrawTextLine(real_cx, real_cy, pred_cx, pred_cy, `${this.Round(center_dst)}`, 'hsl(160, 50%, 40%)')

    int.color = 240
    int.Draw(this.ctx)

    this.DrawTextLine(real.x1, real.y1, real.x1, real.y1, 'x₁ᶢ, y₁ᶢ', `hsl(${BBOX_REAL_COLOR}, 60%, 70%)`, 0.5, 20)
    this.DrawTextLine(real.x2, real.y2 + 18, real.x2, real.y2 + 18, 'x₂ᶢ, y₂ᶢ', `hsl(${BBOX_REAL_COLOR}, 60%, 70%)`, 0.5, 20)

    this.DrawTextLine(pred.x1, pred.y1, pred.x1, pred.y1, 'x₁ᵖ, y₁ᵖ', `hsl(${BBOX_PRED_COLOR}, 60%, 70%)`, 0.5, 20)
    this.DrawTextLine(pred.x2, pred.y2 + 18, pred.x2, pred.y2 + 18, 'x₂ᵖ, y₂ᵖ', `hsl(${BBOX_PRED_COLOR}, 60%, 70%)`, 0.5, 20)

    this.DrawTextLine(int.x1, int.y1, int.x1, int.y1, 'x₁ⁱⁿᵗ, y₁ⁱⁿᵗ', `hsl(240, 60%, 70%)`, 0.5, 20)
    this.DrawTextLine(int.x2, int.y2 + 18, int.x2, int.y2 + 18, 'x₂ⁱⁿᵗ, y₂ⁱⁿᵗ', `hsl(240, 60%, 70%)`, 0.5, 20)
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

Visualizer.prototype.MakeCoordinateLossesTable = function(real, pred) {
    let losses = this.iouTypes.map((iouType) => this.loss.Evaluate(real, pred, 1, iouType))

    let header = `<tr><th>Тип</th>${this.iouTypes.map((iouType) => '<th>L<sub>' + iouType + '</sub></th>').join('')}</tr>`
    let direct = `<tr><td>L</td>${losses.map((v) => '<td><span class="box" style="background: ' + this.LossToColor(v.loss) + '"></span> ' + this.Round(v.loss) + '</td>').join('')}</tr>`
    let inverse = `<tr><td>1 - L</td>${losses.map((v) => '<td><span class="box" style="background: ' + this.LossToColor(1 - v.loss) + '"></span> ' + this.Round(1 - v.loss) + '</td>').join('')}</tr>`
    let dx1 = `<tr><td>∂L/∂x<sub>1</sub></td>${losses.map((v) => '<td>' + this.Round(v.dx1) + '</td>').join('')}</tr>`
    let dy1 = `<tr><td>∂L/∂y<sub>1</sub></td>${losses.map((v) => '<td>' + this.Round(v.dy1) + '</td>').join('')}</tr>`
    let dx2 = `<tr><td>∂L/∂x<sub>2</sub></td>${losses.map((v) => '<td>' + this.Round(v.dx2) + '</td>').join('')}</tr>`
    let dy2 = `<tr><td>∂L/∂y<sub>2</sub></td>${losses.map((v) => '<td>' + this.Round(v.dy2) + '</td>').join('')}</tr>`

    this.metrics.innerHTML += '<b>Координатные функции потерь (L):</b> [0, +∞), меньшие значения лучше'
    this.metrics.innerHTML += `<table>${header}${direct}${inverse}${dx1}${dy1}${dx2}${dy2}</table>`
}

Visualizer.prototype.MakePixelMetricTable = function(real, pred) {
    if (['IoU', 'DIoU', 'CIoU', 'GIoU', 'SCA'].indexOf(this.coordBox.value) == -1)
        return

    let losses = this.GetLosses(real, pred)
    let baseLosses = ['PIoU', 'BWIoU', 'Weighted BWIoU']

    let modifications = [
        { name: 'F', value: function(loss) { return loss }, need: () => true },
        { name: `F × ${this.coordBox.value}`, value: function(loss) { return loss * losses.iou }, need: () => true },
        { name: `(F + 1 - IoU) × ${this.coordBox.value}<br>(champion)`, value: function(loss) { return (loss + 1 - losses.iou_clear) * losses.iou }, need: () => true },
        { name: `(F + 1 - ${this.coordBox.value}) × ${this.coordBox.value}<br>(champion 2)`, value: function(loss) { return (loss + 1 - losses.iou) * losses.iou }, need: () => this.coordBox.value != 'IoU' },
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
            row += `<td><span class="box" style="background: ${this.LossToColor(1 - value)}"></span> ${this.Round(value)}</td>`
        }

        values.push(row + `</tr>`)
    }

    this.metrics.innerHTML += '<hr><b>Пиксельные метрики (F):</b> (-∞, 1], большие значения лучше'
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
    this.MakeCoordinateLossesTable(real, pred)
    this.MakePixelMetricTable(real, pred)
}

Visualizer.prototype.Map = function(x, in_min, in_max, out_min, out_max) {
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min
}

Visualizer.prototype.LossToColor = function(loss) {
    let color

    if (loss <= 0.1)
        color = this.Map(loss, 0, 0.1, 120, 90)
    else if (loss <= 0.5)
        color = this.Map(loss, 0.1, 0.5, 90, 60)
    else if (loss <= 1)
        color = this.Map(loss, 0.5, 1, 60, 0)
    else if (loss <= 2)
        color = this.Map(loss, 1, 2, 0, -60)
    else
        color = 300

    return `hsla(${color}, 80%, 50%, 70%)`
}

Visualizer.prototype.Draw = function() {
    this.Clear()
    this.DrawLoss()

    this.DrawBboxes()
    this.DrawBboxesInfo()
}

Visualizer.prototype.PlotValues = function(data, values, minValue, maxValue,padding, color, index, steps, key) {
    let fontSize = Math.max(12, Math.min(data.width, data.height) / 25)

    data.ctx.font = `${fontSize}px serif`
    data.ctx.textAlign = 'right'
    data.ctx.textBaseline = 'top'
    data.ctx.fillStyle = `hsl(${color}, 50%, 70%)`
    data.ctx.fillText(`${key} = ${this.Round(values[values.length - 1])} (${values.length} steps)`, data.width - padding, padding + index * (fontSize + 1))

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

Visualizer.prototype.InitCanvas = function(canvas, padding, minValue, maxValue, steps, isCenterZero = false) {
    let width = canvas.clientWidth
    let height = canvas.clientHeight
    let y0 = isCenterZero ? height / 2 : height - padding

    canvas.width = width
    canvas.height = height

    let ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, width, height)

    this.DrawLine(ctx, padding, padding, padding, height - padding, '#000')
    this.DrawLine(ctx, padding, y0, width - padding, y0, '#000')

    ctx.textAlign = 'center'
    ctx.textBaseline = isCenterZero ? 'top' : 'bottom'

    this.DrawLine(ctx, width - padding, y0 - 3, width - padding, y0 + 3, '#000')
    ctx.fillText(steps, width - padding, y0 + (isCenterZero ? 5 : -5))

    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'

    this.DrawLine(ctx, padding - 3, padding, padding + 3, padding, '#000')
    ctx.fillText(this.Round(maxValue), padding + 5, padding)

    if (isCenterZero) {
        this.DrawLine(ctx, padding - 3, height - padding, padding + 3, height - padding, '#000')
        ctx.fillText(this.Round(minValue), padding + 5, height - padding)
    }

    return {ctx, width, height }
}

Visualizer.prototype.PlotLosses = function(data, steps, maxLoss, maxError, maxGrad) {
    let padding = 10
    let names = Object.keys(data)
    let sortedNames = names.slice().sort((a, b) => (data[a].errorValues.length - data[b].errorValues.length) + data[a].errorValues[data[a].errorValues.length - 1] - data[b].errorValues[data[b].errorValues.length - 1])

    let gradNames = ['dx1', 'dy1', 'dx2', 'dy2']
    let lossesCtx = this.InitCanvas(this.lossesCanvas, padding, 0, maxLoss, steps)
    let errorCtx = this.InitCanvas(this.errorCanvas, padding, 0, maxError, steps)
    let gradCtxs = gradNames.map((gradName) => this.InitCanvas(this.gradCanvases[gradName], padding, -maxGrad, maxGrad, steps, true))

    for (let index = 0; index < sortedNames.length; index++) {
        let key = sortedNames[index]
        let color = data[key].color
        let grads = data[key].gradValues

        this.PlotValues(lossesCtx, data[key].lossValues, 0, maxLoss, padding, color, index, steps, key)
        this.PlotValues(errorCtx, data[key].errorValues, 0, maxError, padding, color, index, steps, key)

        for (let i = 0; i < gradNames.length; i++)
            this.PlotValues(gradCtxs[i], grads[gradNames[i]], -maxGrad, maxGrad, padding, color, index, steps, key)
    }
}
