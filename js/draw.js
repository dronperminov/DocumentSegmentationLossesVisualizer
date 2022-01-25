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

    real = real[0]
    pred = pred[0]
    let info = real.GetInfo(pred, this.ctx, this.threshold)

    if (info != null) {
        let int = real.Intersection(pred)

        this.metrics.innerHTML +=
        `<table>\
            <tr><th>Bbox</th><th>Coord</th><th>Area</th><th>Black (■)</th><th>White (□)</th></tr>
            <tr>
                <td style="color: hsl(120, 70%, 50%)"><b>real</b></td>
                <td>${real.ToString()}</td>
                <td>${info.realArea}</td>
                <td>${this.Round(info.realBlackCount / info.realArea)} (${info.realBlackCount})</td>
                <td>${this.Round(info.realWhiteCount / info.realArea)} (${info.realWhiteCount})</td>
            </tr>
            <tr>
                <td style="color: hsl(0, 70%, 50%)"><b>pred</b></td>
                <td>${pred.ToString()}</td>
                <td>${info.predArea}</td>
                <td>${this.Round(info.predBlackCount / info.predArea)} (${info.predBlackCount})</td>
                <td>${this.Round(info.predWhiteCount / info.predArea)} (${info.predWhiteCount})</td>
            </tr>
            <tr>
                <td><b>∩</b></td>
                <td>${int.ToString()}</td>
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
            </tr>
        </table><hr>`
    }

    let losses = this.GetLosses(real, pred)

    this.metrics.innerHTML += '<i>Функции потерь:</i><br>'
    this.metrics.innerHTML +=
    `<table>
        <tr>
            <th>Loss</th>
            <th>IoU</th>
            <th>PIoU</th>
            <th>BWIoU</th>
            <th>BWIoU<sub>weighted</sub></th>
        </tr>
        <tr>
            <td>L</td>
            <td rowspan="3"><span class="box" style="background: ${this.LossToColor(losses.iou)}"></span> ${this.Round(losses.iou)}</td>
            <td><span class="box" style="background: ${this.LossToColor(losses.piou)}"></span> ${this.Round(losses.piou)}</td>
            <td><span class="box" style="background: ${this.LossToColor(losses.bwiou)}"></span> ${this.Round(losses.bwiou)}</td>
            <td><span class="box" style="background: ${this.LossToColor(losses.weighted_bwiou)}"></span> ${this.Round(losses.weighted_bwiou)}</td>
        </tr>

        <tr>
            <td>L × IoU</td>
            <td><span class="box" style="background: ${this.LossToColor(losses.piou_iou)}"></span> ${this.Round(losses.piou_iou)}</td>
            <td><span class="box" style="background: ${this.LossToColor(losses.bwiou_iou)}"></span> ${this.Round(losses.bwiou_iou)}</td>
            <td><span class="box" style="background: ${this.LossToColor(losses.weighted_bwiou_iou)}"></span> ${this.Round(losses.weighted_bwiou_iou)}</td>
        </tr>

        <tr>
            <td>(L + 1 - IoU) × IoU</td>
            <td><span class="box" style="background: ${this.LossToColor(losses.piou_champion)}"></span> ${this.Round(losses.piou_champion)}</td>
            <td><span class="box" style="background: ${this.LossToColor(losses.bwiou_champion)}"></span> ${this.Round(losses.bwiou_champion)}</td>
            <td><span class="box" style="background: ${this.LossToColor(losses.weighted_bwiou_champion)}"></span> ${this.Round(losses.weighted_bwiou_champion)}</td>
        </tr>
    </table>`
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
