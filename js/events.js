Visualizer.prototype.KeyDown = function(e) {
    if (this.activeBox == null)
        return

    this.needUpdate = true

    if (e.code == 'ArrowLeft') {
        this.activeBox.Move(-BBOX_MOVE_STEP, 0)
    }
    else if (e.code == 'ArrowRight') {
        this.activeBox.Move(BBOX_MOVE_STEP, 0)
    }
    else if (e.code == 'ArrowUp') {
        this.activeBox.Move(0, -BBOX_MOVE_STEP)
    }
    else if (e.code == 'ArrowDown') {
        this.activeBox.Move(0, BBOX_MOVE_STEP)
    }
    else if (e.code == 'KeyA') {
        this.activeBox.Resize('w', -BBOX_RESIZE_STEP * (e.shiftKey ? -1 : 1), 0)
    }
    else if (e.code == 'KeyS') {
        this.activeBox.Resize('s', 0, BBOX_RESIZE_STEP * (e.shiftKey ? -1 : 1))
    }
    else if (e.code == 'KeyW') {
        this.activeBox.Resize('n', 0, -BBOX_RESIZE_STEP * (e.shiftKey ? -1 : 1))
    }
    else if (e.code == 'KeyD') {
        this.activeBox.Resize('e', BBOX_RESIZE_STEP * (e.shiftKey ? -1 : 1), 0)
    }
    else if (e.code == 'Delete') {
        this.RemoveActiveBbox()
    }
    else if (e.code == 'Escape') {
        this.MouseUp()
        this.activeBox = null
    }
    else {
        return
    }

    e.preventDefault()
}

Visualizer.prototype.CanAddBbox = function(color) {
    if (this.bboxes.length != 1)
        return this.bboxes.length == 0

    return this.bboxes[0].color != color
}

Visualizer.prototype.CanVisualizeAreas = function() {
    return this.bboxes.length == 2 && this.bboxes[0].color != this.bboxes[1].color
}

Visualizer.prototype.MouseDown = function(e) {
    let x = e.offsetX
    let y = e.offsetY

    this.isPressed = true
    this.needUpdate = true
    this.prevPoint.x = x
    this.prevPoint.y = y
    this.activeBox = this.GetBboxAt(x, y)

    if (this.activeBox == null) {
        let color = e.button == 2 ? BBOX_PRED_COLOR : BBOX_REAL_COLOR

        if (this.CanAddBbox(color)) {
            this.activeBox = new BoundingBox(x, y, x, y, color)
            this.action = ACTION_CREATE
        }
    }
    else if (this.activeBox.IsResize(this.currPoint.x, this.currPoint.y)) {
        this.action = ACTION_RESIZE
        this.resizeDir = this.activeBox.GetResizeDir(this.currPoint.x, this.currPoint.y)
    }
    else {
        this.action = ACTION_MOVE
    }
}

Visualizer.prototype.MouseMove = function(e) {
    this.currPoint.x = e.offsetX
    this.currPoint.y = e.offsetY

    let dx = this.currPoint.x - this.prevPoint.x
    let dy = this.currPoint.y - this.prevPoint.y

    if (this.isPressed && this.activeBox != null) {
        this.MakeAction(dx, dy)
    }

    this.prevPoint.x += dx
    this.prevPoint.y += dy
}

Visualizer.prototype.MouseUp = function(e) {
    this.isPressed = false
    this.action = ACTION_NONE

    if (this.activeBox == null)
        return

    this.activeBox.Normalize()

    if (!this.activeBox.IsNormal()) {
        this.RemoveActiveBbox()
        return
    }

    this.AddActiveBbox()
}

Visualizer.prototype.WindowResize = function() {
    let dpr = window.devicePixelRatio || 1
    this.width = this.imageWidth
    this.height = this.imageHeight

    this.canvas.width = this.width * dpr
    this.canvas.height = this.height * dpr
    this.ctx.scale(dpr, dpr)
    this.canvas.style.width = this.width + "px"
    this.canvas.style.height = this.height + "px"
}
