function Visualizer(canvasId, imagesSrc, iouTypes) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext('2d')

    this.imagesSrc = imagesSrc
    this.metrics = document.getElementById('metrics')
    this.controls = document.getElementById('image-controls')
    this.thresholdBox = document.getElementById('threshold-controls')
    this.randomCountBox = document.getElementById('random-count-box')
    this.iouBox = document.getElementById('iou-box')
    this.visualizeAreasBox = document.getElementById('visualize-loss-areas')
    this.optimizeBtn = document.getElementById('optimize-btn')

    this.lossesCanvas = document.getElementById('losses-box')
    this.lossesCtx = this.lossesCanvas.getContext('2d')
    this.lossesCanvas.width = 500
    this.lossesCanvas.height = 400

    this.iouTypes = iouTypes
    this.iou = new GraphIoU()

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

Visualizer.prototype.AddOption = function(select, value) {
    let option = document.createElement('option')
    option.value = value
    option.innerText = value
    select.appendChild(option)
}

Visualizer.prototype.InitControls = function() {
    for (let i = 0; i < this.imagesSrc.length; i++)
        this.AddOption(this.controls, this.imagesSrc[i])

    for (let iouType of this.iouTypes)
        this.AddOption(this.iouBox, iouType)

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

    let scale = isScale ? 1 : iou

    let piou_iou = scale * piou
    let bwiou_iou = scale * bwiou
    let weighted_bwiou_iou = scale * weighted_bwiou

    let piou_champion = scale * (piou + 1 - iou_clear)
    let bwiou_champion = scale * (bwiou + 1 - iou_clear)
    let weighted_bwiou_champion = scale * (weighted_bwiou + 1 - iou_clear)

    let piou_champion2 = scale * (piou + 1 - iou)
    let bwiou_champion2 = scale * (bwiou + 1 - iou)
    let weighted_bwiou_champion2 = scale * (weighted_bwiou + 1 - iou)

    iou = scale

    return {
        iou, iou_clear,
        piou, bwiou, weighted_bwiou,
        piou_iou,  bwiou_iou, weighted_bwiou_iou,
        piou_champion, bwiou_champion, weighted_bwiou_champion,
        piou_champion2, bwiou_champion2, weighted_bwiou_champion2
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

    if (name == 'PIoU (champion 2)')
        return losses.piou_champion2

    if (name == 'BWIoU (champion 2)')
        return losses.bwiou_champion2

    if (name == 'Weighted BWIoU (champion 2)')
        return losses.weighted_bwiou_champion2

    throw "unknown loss '" + name + '"'
}

Visualizer.prototype.RemoveOptimizedBoxes = function() {
    let cleared = []

    for (let box of this.bboxes)
        if (box.color == BBOX_PRED_COLOR || box.color == BBOX_REAL_COLOR)
            cleared.push(box)

    this.bboxes = cleared
}

Visualizer.prototype.Random = function(a, b) {
    return Math.floor(a + Math.random() * (b - a))
}

Visualizer.prototype.RandomBox = function() {
    let x1 = this.Random(0, this.imageWidth - 20)
    let y1 = this.Random(0, this.imageHeight - 20)

    let x2 = this.Random(x1 + 5, this.imageWidth)
    let y2 = this.Random(y1 + 5, this.imageHeight)

    return new BoundingBox(x1, y1, x2, y2, BBOX_PRED_COLOR, this.imageWidth, this.imageHeight, true)
}

Visualizer.prototype.Optimize = function(alpha = 0.0005) {
    this.RemoveOptimizedBoxes()

    let predBoxes = this.GetBoxesByColor(BBOX_PRED_COLOR)
    let data = {}

    let randomBoxes = []

    for (let i = 0; i < +this.randomCountBox.value; i++)
        randomBoxes.push(this.RandomBox())

    if (this.visualizeLoss == 'none') {
        let names = [
            'IoU',
            'PIoU', 'BWIoU', 'Weighted BWIoU',
            'PIoU (champion)', 'BWIoU (champion)', 'Weighted BWIoU (champion)',
        ]

        if (this.iouBox.value != 'IoU') {
            names.push('PIoU (champion 2)')
            names.push('BWIoU (champion 2)')
            names.push('Weighted BWIoU (champion 2)')
        }

        for (let i = 0; i < names.length; i++) {
            let color = LOSS_COLOR_START + i * LOSS_COLOR_STEP

            data[names[i]] = { pred: [], lossValues: [], color: color }

            for (let box of predBoxes) {
                box = box.Copy(names[i], color)
                data[names[i]].pred.push(box)
                this.bboxes.push(box)
            }
        }
    }
    else {
        data[this.visualizeLoss] = { pred: predBoxes, lossValues: [], color: BBOX_PRED_COLOR }
    }

    for (let name of Object.keys(data)) {
        for (let box of randomBoxes) {
            box = box.Copy(name, data[name].color)
            data[name].pred.push(box)
            this.bboxes.push(box)
        }
    }

    this.OptimizeStep(data, 0, alpha)
}

Visualizer.prototype.GetOptimalRealBox = function(predBox, realBoxes) {
    let imax = 0
    let iou_max = -Infinity

    for (let i = 0; i < realBoxes.length; i++) {
        let iou = realBoxes[i].IoU(predBox, 'DIoU')

        if (iou > iou_max) {
            iou_max = iou
            imax = i
        }
    }

    return imax
}

Visualizer.prototype.OptimizeStep = function(data, totalMaxLoss, alpha, steps = 0, evalTime = 0, updateTime = 0) {
    let realBoxes = this.GetBoxesByColor(BBOX_REAL_COLOR)

    let losses = {}
    let maxLoss = 0
    let threshold = 0.014

    this.Clear()

    let t0 = performance.now()
    for (let name of Object.keys(data)) {
        let predBoxes = data[name].pred
        let avg_loss = 0
        losses[name] = []

        for (let j = 0; j < predBoxes.length; j++) {
            let index = this.GetOptimalRealBox(predBoxes[j], realBoxes)
            let scale = this.GetLossByName(realBoxes[index], predBoxes[j], name, true)
            losses[name][j] = this.iou.Evaluate(realBoxes[index], predBoxes[j], scale, this.iouBox.value)
            maxLoss = Math.max(maxLoss, losses[name][j].loss)
            avg_loss += losses[name][j].loss
        }

        avg_loss /= predBoxes.length

        if (avg_loss >= threshold)
            data[name].lossValues.push(avg_loss)
    }

    let t1 = performance.now()

    totalMaxLoss = Math.max(totalMaxLoss, maxLoss)

    this.Draw()
    this.PlotLosses(data, steps, totalMaxLoss)

    if (maxLoss < threshold)
        return

    let t2 = performance.now()
    for (let name of Object.keys(data)) {
        let predBoxes = data[name].pred

        for (let j = 0; j < predBoxes.length; j++) {
            let scale = 1 + losses[name][j].loss

            if (losses[name][j].loss < threshold)
                continue

            if (this.visualizeLoss == 'none')
                predBoxes[j].name = `${name} = ${this.Round(losses[name][j].loss)}`

            predBoxes[j].nx1 -= alpha * losses[name][j].dx1 * scale
            predBoxes[j].nx2 -= alpha * losses[name][j].dx2 * scale
            predBoxes[j].ny1 -= alpha * losses[name][j].dy1 * scale
            predBoxes[j].ny2 -= alpha * losses[name][j].dy2 * scale

            predBoxes[j].x1 = Math.round(predBoxes[j].nx1 * this.imageWidth)
            predBoxes[j].y1 = Math.round(predBoxes[j].ny1 * this.imageHeight)
            predBoxes[j].x2 = Math.round(predBoxes[j].nx2 * this.imageWidth)
            predBoxes[j].y2 = Math.round(predBoxes[j].ny2 * this.imageHeight)
        }
    }
    let t3 = performance.now()

    console.log(`${steps}. eval: ${this.Round(evalTime / (steps + 1))}, update: ${this.Round(updateTime / (steps + 1))}`)

    requestAnimationFrame(() => this.OptimizeStep(data, totalMaxLoss, alpha, steps + 1, evalTime + t1 - t0, updateTime + t3 - t2))
}
