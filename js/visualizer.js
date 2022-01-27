function Visualizer(canvasId, imagesSrc) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext('2d')

    this.imagesSrc = imagesSrc
    this.metrics = document.getElementById('metrics')
    this.controls = document.getElementById('image-controls')
    this.thresholdBox = document.getElementById('threshold-controls')
    this.iouBox = document.getElementById('iou-box')
    this.visualizeAreasBox = document.getElementById('visualize-loss-areas')
    this.optimizeBtn = document.getElementById('optimize-btn')

    this.lossesCanvas = document.getElementById('losses-box')
    this.lossesCtx = this.lossesCanvas.getContext('2d')
    this.lossesCanvas.width = 500
    this.lossesCanvas.height = 400

    this.InitControls()
    this.Reset()

    this.imageIndex = 0
    this.image = this.LoadImage()
    this.bboxes = []
}

Visualizer.prototype.LoadImage = function() {
    let image = new Image()

    image.src = this.imagesSrc[this.imageIndex]
    image.onload = () => {
        this.imageWidth = image.width
        this.imageHeight = image.height
        this.InitEvents()
        this.Reset()
    }

    return image
}

Visualizer.prototype.InitControls = function() {
    for (let i = 0; i < this.imagesSrc.length; i++) {
        let option = document.createElement('option')
        option.value = this.imagesSrc[i]
        option.innerText = this.imagesSrc[i]
        this.controls.appendChild(option)
    }

    this.controls.addEventListener('change', () => this.ChangeImage(this.controls.value))

    this.visualizeLoss = this.visualizeAreasBox.value
    this.visualizeAreasBox.addEventListener('change', () => this.ChangeVisualizeLoss())

    this.threshold = +this.thresholdBox.value
    this.thresholdBox.addEventListener('change', () => { this.threshold = +this.thresholdBox.value; this.needUpdate = true })

    this.iouBox.addEventListener('change', () => { this.needUpdate = true })
    this.optimizeBtn.addEventListener('click', () => this.Optimize())
}

Visualizer.prototype.ChangeVisualizeLoss = function() {
    this.visualizeLoss = this.visualizeAreasBox.value
    this.needUpdate = true
}

Visualizer.prototype.InitEvents = function() {
    window.addEventListener('resize', () => this.WindowResize())
    window.addEventListener('keydown', (e) => this.KeyDown(e))

    this.canvas.addEventListener('mousedown', (e) => this.MouseDown(e))
    this.canvas.addEventListener('mousemove', (e) => this.MouseMove(e))
    this.canvas.addEventListener('mouseup', (e) => this.MouseUp(e))

    this.WindowResize()
}

Visualizer.prototype.ChangeImage = function(src) {
    this.imageIndex = this.imagesSrc.indexOf(src)
    this.image = this.LoadImage()
}

Visualizer.prototype.Reset = function() {
    this.activeBox = null

    this.isPressed = false
    this.currPoint = { x: -1, y: -1 }
    this.prevPoint = { x: -1, y: -1 }
    this.action = ACTION_NONE

    this.needUpdate = true
}

Visualizer.prototype.GetBboxAt = function(x, y) {
    for (let i = this.bboxes.length - 1; i >= 0; i--) {
        if (this.bboxes[i].IsMouseHover(x, y)) {
            let bbox = this.bboxes[i]
            this.bboxes.splice(i, 1)
            this.bboxes.push(bbox)
            return bbox
        }
    }

    return null
}

Visualizer.prototype.RemoveActiveBbox = function() {
    let index = this.bboxes.indexOf(this.activeBox)

    if (index > -1) {
        this.bboxes.splice(index, 1)
    }

    this.activeBox = null
    this.needUpdate = true
}

Visualizer.prototype.AddActiveBbox = function() {
    this.needUpdate = true

    if (this.activeBox.IsCreated())
        return

    this.activeBox.Create()
    this.bboxes.push(this.activeBox)
}

Visualizer.prototype.MakeAction = function(dx, dy) {
    if (this.action == ACTION_RESIZE) {
        this.activeBox.Resize(this.resizeDir, dx, dy)
    }
    else if (this.action == ACTION_MOVE || this.action == ACTION_CREATE) {
        this.activeBox.Move(dx, dy)
    }

    this.needUpdate = true
}

Visualizer.prototype.GetBoxesByColor = function(color) {
    let bboxes = []

    for (bbox of this.bboxes)
        if (bbox.color == color)
            bboxes.push(bbox)

    return bboxes
}

Visualizer.prototype.RestoreBboxes = function(data) {
    bboxes = JSON.parse(data)

    for (let bbox of bboxes) {
        let box = new BoundingBox(bbox.x1, bbox.y1, bbox.x2, bbox.y2, bbox.color, bbox.iw, bbox.ih)
        box.isCreated = bbox.isCreated
        this.bboxes.push(box)
    }
}

Visualizer.prototype.GetLosses = function(real, pred, isScale = false) {
    let data = this.ctx.getImageData(0, 0, this.imageWidth, this.imageHeight).data
    let info = real.GetInfo(pred, data, this.threshold)

    let iou_clear = real.IoU(pred)
    let iou = real.IoU(pred, this.iouBox.value)

    let piou = PIoU(info)
    let bwiou = BWIoU(info)
    let weighted_bwiou = WeightedBWIoU(info)

    if (isScale)
        iou = 1

    let piou_iou = iou * piou
    let bwiou_iou = iou * bwiou
    let weighted_bwiou_iou = iou * weighted_bwiou

    let piou_champion = iou * (piou + 1 - iou_clear)
    let bwiou_champion = iou * (bwiou + 1 - iou_clear)
    let weighted_bwiou_champion = iou * (weighted_bwiou + 1 - iou_clear)

    return {
        iou, iou_clear,
        piou, bwiou, weighted_bwiou,
        piou_iou, bwiou_iou, weighted_bwiou_iou,
        piou_champion, bwiou_champion, weighted_bwiou_champion
    }
}

Visualizer.prototype.GetLossByName = function(real, pred, name, isScale = false) {
    let losses = this.GetLosses(real, pred, isScale)

    if (name == 'IoU')
        return losses.iou

    if (name == 'PIoU')
        return losses.piou

    if (name == 'BWIoU')
        return losses.bwiou

    if (name == 'Weighted BWIoU')
        return losses.weighted_bwiou

    if (name == 'PIoU (champion)')
        return losses.piou_champion

    if (name == 'BWIoU (champion)')
        return losses.bwiou_champion

    if (name == 'Weighted BWIoU (champion)')
        return losses.weighted_bwiou_champion

    throw "unknown loss '" + name + '"'
}

Visualizer.prototype.RemoveOptimizedBoxes = function() {
    let cleared = []

    for (let box of this.bboxes)
        if (box.color == BBOX_PRED_COLOR || box.color == BBOX_REAL_COLOR)
            cleared.push(box)

    this.bboxes = cleared
}

Visualizer.prototype.Optimize = function(alpha = 0.0005) {
    this.RemoveOptimizedBoxes()

    let predBox = this.GetBoxesByColor(BBOX_PRED_COLOR)[0]
    let predBoxes = []
    let names = []

    if (this.visualizeLoss == 'none') {
        names = ['IoU', 'PIoU', 'BWIoU', 'Weighted BWIoU', 'PIoU (champion)', 'BWIoU (champion)', 'Weighted BWIoU (champion)']

        for (let i = 0; i < names.length; i++) {
            let box = predBox.Copy(names[i], LOSS_COLOR_START + i * LOSS_COLOR_STEP)
            predBoxes.push(box)
            this.bboxes.push(box)
        }
    }
    else {
        names = [this.visualizeLoss]
        predBoxes.push(predBox)
    }

    let lossValues = {}
    for (let name of names)
        lossValues[name] = []

    this.iou = new GraphIoU()
    this.OptimizeStep(predBoxes, names, lossValues, 0, alpha)
}

Visualizer.prototype.GetOptimalRealBox = function(predBox, realBoxes) {
    let imax = 0
    let iou_max = -Infinity

    for (let i = 0; i < realBoxes.length; i++) {
        let iou = realBoxes[i].IoU(predBox, true, false)

        if (iou > iou_max) {
            iou_max = iou
            imax = i
        }
    }

    return imax
}

Visualizer.prototype.OptimizeStep = function(predBoxes, names, lossValues, totalMaxLoss, alpha, steps = 0, time = 0) {
    let realBoxes = this.GetBoxesByColor(BBOX_REAL_COLOR)

    let losses = []
    let maxLoss = 0
    let threshold = 0.014

    this.Clear()

    let t0 = performance.now()
    for (let i = 0; i < names.length; i++) {
        let index = this.GetOptimalRealBox(predBoxes[i], realBoxes)
        let scale = this.GetLossByName(realBoxes[index], predBoxes[i], names[i], true)
        losses[i] = this.iou.Evaluate(realBoxes[index], predBoxes[i], scale, this.iouBox.value)
        maxLoss = Math.max(maxLoss, losses[i].loss)
    }
    let t1 = performance.now()

    totalMaxLoss = Math.max(totalMaxLoss, maxLoss)
    this.needUpdate = true
    this.Draw()
    this.PlotLosses(lossValues, names, steps, totalMaxLoss)

    if (maxLoss < threshold)
        return

    for (let i = 0; i < names.length; i++) {
        let scale = 1 + losses[i].loss

        if (losses[i].loss < threshold)
            continue

        lossValues[names[i]].push(losses[i].loss)
        console.log(losses[i].loss, steps)

        if (this.visualizeLoss == 'none') {
            predBoxes[i].name = `${names[i]} = ${this.Round(losses[i].loss)}`
        }

        predBoxes[i].nx1 -= alpha * losses[i].dx1 * scale
        predBoxes[i].nx2 -= alpha * losses[i].dx2 * scale
        predBoxes[i].ny1 -= alpha * losses[i].dy1 * scale
        predBoxes[i].ny2 -= alpha * losses[i].dy2 * scale

        predBoxes[i].x1 = Math.round(predBoxes[i].nx1 * this.imageWidth)
        predBoxes[i].y1 = Math.round(predBoxes[i].ny1 * this.imageHeight)
        predBoxes[i].x2 = Math.round(predBoxes[i].nx2 * this.imageWidth)
        predBoxes[i].y2 = Math.round(predBoxes[i].ny2 * this.imageHeight)
    }

    console.log('time:', time / (steps + 1), '\n')

    requestAnimationFrame(() => this.OptimizeStep(predBoxes, names, lossValues, totalMaxLoss, alpha, steps + 1, time + t1 - t0))
}
