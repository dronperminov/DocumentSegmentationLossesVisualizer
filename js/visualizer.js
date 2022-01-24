function Visualizer(canvasId, imagesSrc, metricsId, imageControlsId, thresholdControlsId, visualizeAreasId) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext('2d')

    this.imagesSrc = imagesSrc
    this.metrics = document.getElementById(metricsId)
    this.controls = document.getElementById(imageControlsId)
    this.thresholdBox = document.getElementById(thresholdControlsId)
    this.visualizeAreasBox = document.getElementById(visualizeAreasId)

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
    this.visualizeAreasBox.addEventListener('change', () => { this.visualizeLoss = this.visualizeAreasBox.value; this.needUpdate = true })

    this.threshold = +this.thresholdBox.value
    this.thresholdBox.addEventListener('change', () => { this.threshold = +this.thresholdBox.value; this.needUpdate = true })
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

Visualizer.prototype.EvaluateLoss = function(isDIoU) {
    this.real = this.GetBoxesByColor(BBOX_REAL_COLOR)[0]
    this.pred = this.GetBoxesByColor(BBOX_PRED_COLOR)[0]

    // real nodes
    let real_x1 = new Number(this.real.x1)
    let real_x2 = new Number(this.real.x2)

    let real_y1 = new Number(this.real.y1)
    let real_y2 = new Number(this.real.y2)

    let real_width = new Sub(real_x2, real_x1)
    let real_height = new Sub(real_y2, real_y1)
    let real_area = new Mult(real_width, real_height)

    // pred nodes
    let pred_x1 = new Number(this.pred.x1)
    let pred_x2 = new Number(this.pred.x2)

    let pred_y1 = new Number(this.pred.y1)
    let pred_y2 = new Number(this.pred.y2)

    let pred_width = new Sub(pred_x2, pred_x1)
    let pred_height = new Sub(pred_y2, pred_y1)
    let pred_area = new Mult(pred_width, pred_height)

    // int nodes
    let int_x1 = new Max(real_x1, pred_x1)
    let int_x2 = new Min(real_x2, pred_x2)

    let int_y1 = new Max(real_y1, pred_y1)
    let int_y2 = new Min(real_y2, pred_y2)

    let int_width = new Max(new Sub(int_x2, int_x1), new Number(0))
    let int_height = new Max(new Sub(int_y2, int_y1), new Number(0))
    let int_area = new Mult(int_width, int_height)

    let union_area = new Sub(new Add(real_area, pred_area), int_area)
    let iou = new Div(int_area, union_area)

    if (isDIoU) {
        let cw = new Sub(new Max(pred_x2, real_x2), new Min(pred_x1, real_x1))
        let ch = new Sub(new Max(pred_y2, real_y2), new Min(pred_y1, real_y1))
        let c2 = new Add(new Mult(cw, cw), new Mult(ch, ch))

        let arg1 = new Sub(new Add(real_x1, real_x2), new Add(pred_x1, pred_x2))
        let arg2 = new Sub(new Add(real_y1, real_y2), new Add(pred_y1, pred_y2))

        let rho2 = new Div(new Add(new Mult(arg1, arg1), new Mult(arg2, arg2)), new Number(4))
        iou = new Sub(iou, new Div(rho2, c2))
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

Visualizer.prototype.Optimize = function(isDIoU = true, steps = 0, alpha = 50) {
    let loss = this.EvaluateLoss(isDIoU)

    if (loss.loss < 0.01)
        return

    let scale = 1 + loss.loss

    console.log(loss.loss, steps)
    this.pred.x1 -= alpha * loss.dx1 * scale
    this.pred.x2 -= alpha * loss.dx2 * scale
    this.pred.y1 -= alpha * loss.dy1 * scale
    this.pred.y2 -= alpha * loss.dy2 * scale
    this.needUpdate = true
    requestAnimationFrame(() => this.Optimize(isDIoU, steps + 1, alpha))
}