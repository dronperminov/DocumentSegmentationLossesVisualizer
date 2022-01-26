function Visualizer(canvasId, imagesSrc) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext('2d')

    this.imagesSrc = imagesSrc
    this.metrics = document.getElementById('metrics')
    this.controls = document.getElementById('image-controls')
    this.thresholdBox = document.getElementById('threshold-controls')
    this.diouBox = document.getElementById('diou-box')
    this.ciouBox = document.getElementById('ciou-box')
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

    this.diouBox.addEventListener('change', () => { this.needUpdate = true })
    this.ciouBox.addEventListener('change', () => { this.needUpdate = true })

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
        let box = new BoundingBox(bbox.x1, bbox.y1, bbox.x2, bbox.y2, bbox.color)
        box.isCreated = bbox.isCreated
        this.bboxes.push(box)
    }
}

Visualizer.prototype.GetLosses = function(real, pred, isScale = false) {
    let iou_clear = real.IoU(pred, false, false)
    let iou = real.IoU(pred, this.diouBox.checked, this.ciouBox.checked)
    let piou = real.PIoU(pred, this.ctx, this.threshold)
    let bwiou = real.BWIoU(pred, this.ctx, this.threshold)
    let weighted_bwiou = real.WeightedBWIoU(pred, this.ctx, this.threshold)

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


Visualizer.prototype.EvaluateLoss = function(real, pred, realBox, predBox, lossName) {
    // real nodes
    let real_x1 = new Constant(real.x1)
    let real_x2 = new Constant(real.x2)

    let real_y1 = new Constant(real.y1)
    let real_y2 = new Constant(real.y2)

    let real_width = new Sub(real_x2, real_x1)
    let real_height = new Sub(real_y2, real_y1)
    let real_area = new Mult(real_width, real_height)

    // pred nodes
    let pred_x1 = new Variable(pred.x1)
    let pred_x2 = new Variable(pred.x2)

    let pred_y1 = new Variable(pred.y1)
    let pred_y2 = new Variable(pred.y2)

    let pred_width = new Sub(pred_x2, pred_x1)
    let pred_height = new Sub(pred_y2, pred_y1)
    let pred_area = new Mult(pred_width, pred_height)

    // int nodes
    let int_x1 = new Max(real_x1, pred_x1)
    let int_x2 = new Min(real_x2, pred_x2)

    let int_y1 = new Max(real_y1, pred_y1)
    let int_y2 = new Min(real_y2, pred_y2)

    let int_width = new Clamp(new Sub(int_x2, int_x1), 0)
    let int_height = new Clamp(new Sub(int_y2, int_y1), 0)
    let int_area = new Mult(int_width, int_height)

    let union_area = new Sub(new Add(real_area, pred_area), int_area)
    let iou = new Div(int_area, union_area)

    let scale = this.GetLossByName(realBox, predBox, lossName, true)

    iou = new Mult(iou, new Constant(scale))

    if (this.diouBox.checked || this.ciouBox.checked) {
        let cw = new Sub(new Max(pred_x2, real_x2), new Min(pred_x1, real_x1))
        let ch = new Sub(new Max(pred_y2, real_y2), new Min(pred_y1, real_y1))
        let c2 = new Add(new Square(cw), new Square(ch))

        let arg1 = new Sub(new Add(real_x1, real_x2), new Add(pred_x1, pred_x2))
        let arg2 = new Sub(new Add(real_y1, real_y2), new Add(pred_y1, pred_y2))

        let rho2 = new Div(new Add(new Square(arg1), new Square(arg2)), new Constant(4))

        if (this.ciouBox.checked) {
            let a1 = new Atan(new Div(real_width, real_height))
            let a2 = new Atan(new Div(pred_width, pred_height))
            let a = new Sub(a2, a1)

            let v = new Mult(new Constant(4 / (Math.PI * Math.PI)), new Square(a))
            let alpha = new Div(v, new Add(new Sub(v, iou), new Constant(1 + 1e-8)))

            iou = new Sub(iou, new Add(new Div(rho2, c2), new Mult(v, alpha)))
        }
        else {
            iou = new Sub(iou, new Div(rho2, c2))
        }
    }

    let L = iou.Forward()
    iou.Backward(1)

    return {
        loss: 1 - L,
        dx1: -pred_x1.grad,
        dx2: -pred_x2.grad,
        dy1: -pred_y1.grad,
        dy2: -pred_y2.grad,
    }
}

Visualizer.prototype.Optimize = function(alpha = 0.0005) {
    let realBoxes = this.GetBoxesByColor(BBOX_REAL_COLOR)
    let predBox = this.GetBoxesByColor(BBOX_PRED_COLOR)[0]

    let reals = []

    for (let box of realBoxes) {
        reals.push(box.GetNormalizedParams(this.imageWidth, this.imageHeight))
    }

    let predBoxes = []
    let preds = []
    let names = []

    if (this.visualizeLoss == 'none') {
        names = ['IoU', 'PIoU', 'BWIoU', 'Weighted BWIoU', 'PIoU (champion)', 'BWIoU (champion)', 'Weighted BWIoU (champion)']

        for (let i = 0; i < names.length; i++) {
            let box = predBox.Copy(names[i], i * LOSS_COLOR_STEP)
            predBoxes.push(box)
            this.bboxes.push(box)
            preds.push(box.GetNormalizedParams(this.imageWidth, this.imageHeight))
        }
    }
    else {
        names = [this.visualizeLoss]
        predBoxes.push(predBox)
        preds.push(predBox.GetNormalizedParams(this.imageWidth, this.imageHeight))
    }

    let lossValues = {}
    for (let name of names)
        lossValues[name] = []

    let totalMaxLoss = 0

    this.OptimizeStep(reals, preds, realBoxes, predBoxes, names, lossValues, totalMaxLoss, alpha)
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

Visualizer.prototype.OptimizeStep = function(reals, preds, realBoxes, predBoxes, names, lossValues, totalMaxLoss, alpha, steps = 0) {
    let losses = []
    let maxLoss = 0
    let threshold = 0.014

    this.Clear()

    for (let i = 0; i < names.length; i++) {
        let index = this.GetOptimalRealBox(predBoxes[i], realBoxes)
        losses[i] = this.EvaluateLoss(reals[index], preds[i], realBoxes[index], predBoxes[i], names[i])
        maxLoss = Math.max(maxLoss, losses[i].loss)
    }

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

        preds[i].x1 -= alpha * losses[i].dx1 * scale
        preds[i].x2 -= alpha * losses[i].dx2 * scale
        preds[i].y1 -= alpha * losses[i].dy1 * scale
        preds[i].y2 -= alpha * losses[i].dy2 * scale

        if (this.visualizeLoss == 'none') {
            predBoxes[i].name = `${names[i]} = ${this.Round(losses[i].loss)}`
        }

        predBoxes[i].x1 = Math.round(preds[i].x1 * this.imageWidth)
        predBoxes[i].y1 = Math.round(preds[i].y1 * this.imageHeight)
        predBoxes[i].x2 = Math.round(preds[i].x2 * this.imageWidth)
        predBoxes[i].y2 = Math.round(preds[i].y2 * this.imageHeight)
    }

    console.log('')

    requestAnimationFrame(() => this.OptimizeStep(reals, preds, realBoxes, predBoxes, names, lossValues, totalMaxLoss, alpha, steps + 1))
}