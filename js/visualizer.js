function Visualizer(canvasId, imagesSrc, coordNames) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext('2d')

    this.imagesSrc = imagesSrc
    this.metrics = document.getElementById('metrics')
    this.controls = document.getElementById('image-controls')
    this.thresholdBox = document.getElementById('threshold-controls')
    this.randomCountBox = document.getElementById('random-count-box')
    this.coordNameBox = document.getElementById('coord-name-box')
    this.optimizeBtn = document.getElementById('optimize-btn')
    this.optimizeCoordBtn = document.getElementById('optimize-coord-btn')

    this.plotBox = document.getElementById('plot-box')
    this.lossesCanvas = document.getElementById('losses-box')
    this.errorCanvas = document.getElementById('error-box')
    this.gradCanvases = {
        'dx1': document.getElementById('dx1-box'),
        'dy1': document.getElementById('dy1-box'),
        'dx2': document.getElementById('dx2-box'),
        'dy2': document.getElementById('dy2-box'),
    }

    this.coordNames = coordNames
    this.loss = new GraphLoss()

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

    for (let coordName of this.coordNames)
        this.AddOption(this.coordNameBox, coordName)

    this.controls.addEventListener('change', () => this.ChangeImage(this.controls.value))

    this.threshold = +this.thresholdBox.value
    this.thresholdBox.addEventListener('change', () => this.ChangeThreshold())

    this.optimizeBtn.addEventListener('click', () => this.Optimize())
    this.optimizeCoordBtn.addEventListener('click', () => this.Optimize(true))

    this.plotBox.style.display = 'none'
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

Visualizer.prototype.ChangeThreshold = function() {
    this.threshold = +this.thresholdBox.value
    this.pixelsData.UpdateBlackMask(this.threshold)
}

Visualizer.prototype.Reset = function() {
    this.activeBox = null

    this.isPressed = false
    this.currPoint = { x: -1, y: -1 }
    this.prevPoint = { x: -1, y: -1 }
    this.action = ACTION_NONE
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
}

Visualizer.prototype.AddActiveBbox = function() {
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
    let info = real.GetInfo(pred, this.pixelsData)

    let iou_clear = real.IoU(pred)
    let iou = real.IoU(pred, this.coordNameBox.value)

    let piou = PIoU(info)
    let bwiou = BWIoU(info)
    let weighted_bwiou = WeightedBWIoU(info)

    let scale = isScale ? 1 : iou

    let piou_iou = scale * piou
    let bwiou_iou = scale * bwiou
    let weighted_bwiou_iou = scale * weighted_bwiou

    let piou_champion = scale * (piou + 1 - iou)
    let bwiou_champion = scale * (bwiou + 1 - iou)
    let weighted_bwiou_champion = scale * (weighted_bwiou + 1 - iou)

    iou = scale

    return {
        iou, iou_clear,
        piou, bwiou, weighted_bwiou,
        piou_iou,  bwiou_iou, weighted_bwiou_iou,
        piou_champion, bwiou_champion, weighted_bwiou_champion,
    }
}

Visualizer.prototype.GetLossByName = function(real, pred, name, isScale = false) {
    if (name == 'IoU' && isScale)
        return 1

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

Visualizer.prototype.Random = function(a, b) {
    return Math.floor(a + Math.random() * (b - a))
}

Visualizer.prototype.RandomBox = function(color) {
    let x1 = this.Random(0, this.imageWidth - 100)
    let y1 = this.Random(0, this.imageHeight - 100)

    let x2 = this.Random(x1 + 50, this.imageWidth)
    let y2 = this.Random(y1 + 50, this.imageHeight)

    return new BoundingBox(x1, y1, x2, y2, color, this.imageWidth, this.imageHeight, true)
}

Visualizer.prototype.GetRandomBoxes = function(count) {
    let randomBoxes = []

    for (let i = 0; i < count; i++)
        randomBoxes.push(this.RandomBox(BBOX_PRED_COLOR))

    return randomBoxes
}

Visualizer.prototype.Optimize = function(compareCoordinateLosses = false, alpha = 0.0005) {
    this.RemoveOptimizedBoxes()

    let names = []
    let lossNames = []
    let coordNames = []

    if (compareCoordinateLosses) {
        coordNames = this.coordNames.filter((v) => v != 'IoU')
        names = coordNames
        lossNames = names.map((v) => 'IoU')
    }
    else {
        names = [
            'IoU',
            'PIoU', 'BWIoU', 'Weighted BWIoU',
            'PIoU (champion)', 'BWIoU (champion)', 'Weighted BWIoU (champion)',
        ]

        lossNames = names
        coordNames = lossNames.map((v) => this.coordNameBox.value)
    }

    let data = {}
    let predBoxes = this.GetBoxesByColor(BBOX_PRED_COLOR)
    let randomBoxes = this.GetRandomBoxes(+this.randomCountBox.value)

    for (let i = 0; i < names.length; i++) {
        let key = names[i]
        let color = this.Map(i, 0, names.length - 1, LOSS_COLOR_START, LOSS_COLOR_END)

        data[key] = {
            pred: [],
            lossName: lossNames[i],
            coordName: coordNames[i],
            color: color,

            lossValues: [],
            errorValues: [],
            gradValues: { 'dx1': [], 'dy1': [], 'dx2': [], 'dy2': [] }
        }

        for (let box of predBoxes) {
            box = box.Copy(key, color)
            data[key].pred.push(box)
            this.bboxes.push(box)
        }

        for (let box of randomBoxes) {
            box = box.Copy(key, data[key].color)
            data[key].pred.push(box)
            this.bboxes.push(box)
        }
    }

    this.plotBox.style.display = ''
    this.OptimizeStep(data, alpha)
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

Visualizer.prototype.OptimizeStep = function(data, alpha, totalMaxLoss = 0, totalMaxError = 0, totalMaxGrad = 0, steps = 0, evalTime = 0, drawTime = 0, updateTime = 0) {
    let realBoxes = this.GetBoxesByColor(BBOX_REAL_COLOR)

    let losses = {}
    let maxLoss = 0
    let maxError = 0
    let threshold = 0.005
    let isStop = true

    this.Clear()

    let t0 = performance.now()
    for (let key of Object.keys(data)) {
        let predBoxes = data[key].pred
        let coordName = data[key].coordName
        let errorValues = data[key].errorValues
        let avg_loss = 0
        let avg_error = 0
        let avg_grads = { 'dx1': 0, 'dy1': 0, 'dx2': 0, 'dy2': 0 }
        losses[key] = []

        for (let j = 0; j < predBoxes.length; j++) {
            let index = this.GetOptimalRealBox(predBoxes[j], realBoxes)
            let scale = this.GetLossByName(realBoxes[index], predBoxes[j], data[key].lossName, true)
            let loss = this.loss.Evaluate(realBoxes[index], predBoxes[j], scale, coordName)

            losses[key][j] = loss

            avg_loss += loss.loss
            avg_error += realBoxes[index].RegressionError(predBoxes[j])

            for (let gradName of Object.keys(avg_grads))
                avg_grads[gradName] += loss[gradName]
        }

        avg_loss /= predBoxes.length
        avg_error /= predBoxes.length

        maxLoss = Math.max(maxLoss, avg_loss)
        maxError = Math.max(maxError, avg_error)

        if (errorValues.length == 0 || errorValues[errorValues.length - 1] >= threshold) {
            data[key].lossValues.push(avg_loss)
            data[key].errorValues.push(avg_error)

            for (let gradName of Object.keys(avg_grads)) {
                let avg_grad = avg_grads[gradName] / predBoxes.length
                data[key].gradValues[gradName].push(avg_grad)
                totalMaxGrad = Math.max(totalMaxGrad, Math.abs(avg_grad))
            }

            isStop = false
        }
    }

    let t1 = performance.now()

    totalMaxLoss = Math.max(totalMaxLoss, maxLoss)
    totalMaxError = Math.max(totalMaxError, maxError)

    this.Draw()
    this.PlotLosses(data, steps, totalMaxLoss, totalMaxError, totalMaxGrad)

    if (isStop)
        return

    let t2 = performance.now()
    for (let key of Object.keys(data)) {
        let predBoxes = data[key].pred

        for (let j = 0; j < predBoxes.length; j++) {
            predBoxes[j].name = `${key} = ${this.Round(losses[key][j].loss)}`

            predBoxes[j].nx1 -= alpha * losses[key][j].dx1
            predBoxes[j].nx2 -= alpha * losses[key][j].dx2
            predBoxes[j].ny1 -= alpha * losses[key][j].dy1
            predBoxes[j].ny2 -= alpha * losses[key][j].dy2

            if (predBoxes[j].nx1 > predBoxes[j].nx2) {
                let tmp = predBoxes[j].nx1
                predBoxes[j].nx1 = predBoxes[j].nx2
                predBoxes[j].nx2 = tmp
            }

            if (predBoxes[j].ny1 > predBoxes[j].ny2) {
                let tmp = predBoxes[j].ny1
                predBoxes[j].ny1 = predBoxes[j].ny2
                predBoxes[j].ny2 = tmp
            }

            predBoxes[j].x1 = Math.round(predBoxes[j].nx1 * this.imageWidth)
            predBoxes[j].y1 = Math.round(predBoxes[j].ny1 * this.imageHeight)
            predBoxes[j].x2 = Math.round(predBoxes[j].nx2 * this.imageWidth)
            predBoxes[j].y2 = Math.round(predBoxes[j].ny2 * this.imageHeight)
        }
    }
    let t3 = performance.now()

    console.log(`${steps}. eval: ${this.Round(evalTime / (steps + 1))}, draw: ${this.Round(drawTime / (steps + 1))}, update: ${this.Round(updateTime / (steps + 1))}`)

    requestAnimationFrame(() => this.OptimizeStep(data, alpha, totalMaxLoss, totalMaxError, totalMaxGrad, steps + 1, evalTime + t1 - t0, drawTime + t2 - t1, updateTime + t3 - t2))
}
