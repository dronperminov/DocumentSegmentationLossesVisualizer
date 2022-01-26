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
    this.visualizeAreasBox.parentNode.style.display = 'none'
    this.visualizeAreasBox.addEventListener('change', () => this.ChangeVisualizeLoss())

    this.threshold = +this.thresholdBox.value
    this.thresholdBox.addEventListener('change', () => { this.threshold = +this.thresholdBox.value; this.needUpdate = true })

    this.diouBox.addEventListener('change', () => { this.needUpdate = true })
    this.ciouBox.addEventListener('change', () => { this.needUpdate = true })

    this.optimizeBtn.addEventListener('click', () => this.Optimize())
    this.ChangeVisualizeLoss()
}

Visualizer.prototype.ChangeVisualizeLoss = function() {
    this.visualizeLoss = this.visualizeAreasBox.value
    this.optimizeBtn.style.display = this.visualizeLoss == 'none' ? 'none' : ''
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


Visualizer.prototype.EvaluateLoss = function(real, pred, realBox, predBox) {
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
    let scale = this.GetLossByName(realBox, predBox, this.visualizeLoss, true)
    iou.Backward(scale)

    return {
        loss: 1 - L,
        dx1: -pred_x1.grad,
        dx2: -pred_x2.grad,
        dy1: -pred_y1.grad,
        dy2: -pred_y2.grad,
    }
}

Visualizer.prototype.Optimize = function(alpha = 0.0005) {
    let realBox = this.GetBoxesByColor(BBOX_REAL_COLOR)[0]
    let predBox = this.GetBoxesByColor(BBOX_PRED_COLOR)[0]

    let real = { x1: realBox.x1 / this.imageWidth, y1: realBox.y1 / this.imageHeight, x2: realBox.x2 / this.imageWidth, y2: realBox.y2 / this.imageHeight }
    let pred = { x1: predBox.x1 / this.imageWidth, y1: predBox.y1 / this.imageHeight, x2: predBox.x2 / this.imageWidth, y2: predBox.y2 / this.imageHeight }

    this.OptimizeStep(real, pred, realBox, predBox, alpha)
}

Visualizer.prototype.OptimizeStep = function(real, pred, realBox, predBox, alpha, steps = 0) {
    let loss = this.EvaluateLoss(real, pred, realBox, predBox)

    if (loss.loss < 0.01)
        return

    let scale = 1 + loss.loss

    console.log(loss.loss, steps)

    pred.x1 -= alpha * loss.dx1 * scale
    pred.x2 -= alpha * loss.dx2 * scale
    pred.y1 -= alpha * loss.dy1 * scale
    pred.y2 -= alpha * loss.dy2 * scale

    predBox.x1 = Math.round(pred.x1 * this.imageWidth)
    predBox.y1 = Math.round(pred.y1 * this.imageHeight)
    predBox.x2 = Math.round(pred.x2 * this.imageWidth)
    predBox.y2 = Math.round(pred.y2 * this.imageHeight)

    this.needUpdate = true
    requestAnimationFrame(() => this.OptimizeStep(real, pred, realBox, predBox, alpha, steps + 1))
}