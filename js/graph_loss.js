function GraphLoss() {
    // real nodes
    this.real_x1 = new Constant()
    this.real_x2 = new Constant()

    this.real_y1 = new Constant()
    this.real_y2 = new Constant()

    // pred nodes
    this.pred_x1 = new Variable()
    this.pred_x2 = new Variable()

    this.pred_y1 = new Variable()
    this.pred_y2 = new Variable()

    // real
    let real_width = new Sub(this.real_x2, this.real_x1)
    let real_height = new Sub(this.real_y2, this.real_y1)
    let real_area = new Mult(real_width, real_height)
    let real_aspect_ratio = new Div(real_width, real_height)
    let real_center_x = new Div(new Add(this.real_x1, this.real_x2), TWO)
    let real_center_y = new Div(new Add(this.real_y1, this.real_y2), TWO)

    // pred
    let pred_width = new Sub(this.pred_x2, this.pred_x1)
    let pred_height = new Sub(this.pred_y2, this.pred_y1)
    let pred_area = new Mult(pred_width, pred_height)
    let pred_aspect_ratio = new Div(pred_width, pred_height)
    let pred_center_x = new Div(new Add(this.pred_x1, this.pred_x2), TWO)
    let pred_center_y = new Div(new Add(this.pred_y1, this.pred_y2), TWO)

    // intersection nodes
    let int_x1 = new Max(this.real_x1, this.pred_x1)
    let int_x2 = new Min(this.real_x2, this.pred_x2)

    let int_y1 = new Max(this.real_y1, this.pred_y1)
    let int_y2 = new Min(this.real_y2, this.pred_y2)

    let int_width = new Sub(int_x2, int_x1)
    let int_height = new Sub(int_y2, int_y1)
    let int_area = new Mult(new Clamp(int_width, 0), new Clamp(int_height, 0))
    let int_diag = new Add(new Square(int_width), new Square(int_height))

    let union_area = new Sub(new Add(real_area, pred_area), int_area)

    // convex nodes
    let convex_x1 = new Min(this.real_x1, this.pred_x1)
    let convex_x2 = new Max(this.real_x2, this.pred_x2)
    let convex_y1 = new Min(this.real_y1, this.pred_y1)
    let convex_y2 = new Max(this.real_y2, this.pred_y2)

    let convex_width = new Sub(convex_x2, convex_x1)
    let convex_height = new Sub(convex_y2, convex_y1)
    let convex_area = new Mult(convex_width, convex_height)
    let convex_diag = new Add(new Square(convex_width), new Square(convex_height))

    let iou = new Div(int_area, union_area)

    // DIoU and CIoU calculation
    let rho2 = new SquareNorm(pred_center_x, real_center_x, pred_center_y, real_center_y) // квадрат расстояния между центрами
    let v = new Mult(new Constant(4 / (Math.PI * Math.PI)), new Square(new Sub(new Atan(pred_aspect_ratio), new Atan(real_aspect_ratio))))
    let alpha = new NoGrad(new Div(v, new Add(new Sub(v, iou), new Constant(1 + 1e-8))))

    let Lcenter = new Div(rho2, convex_diag)

    this.iou = new Sub(ONE, iou)
    this.ciou = new Sum(this.iou, Lcenter, new Mult(v, alpha))
    this.diou = new Sum(this.iou, Lcenter)
    this.giou = new Sum(this.iou, new Sub(ONE, new Div(union_area, convex_area)))

    let so = new Add(new Div(int_width, convex_width), new Div(int_height, convex_height))
    let Lso = new Sub(TWO, so)

    let d_lt = new SquareNorm(this.pred_x1, this.real_x1, this.pred_y1, this.real_y1)
    let d_rb = new SquareNorm(this.pred_x2, this.real_x2, this.pred_y2, this.real_y2)
    let Lcd = new Div(new Add(d_lt, d_rb), convex_diag)

    let min_width = new Min(real_width, pred_width)
    let min_height = new Min(real_height, pred_height)
    let max_width = new Max(real_width, pred_width)
    let max_height = new Max(real_height, pred_height)

    let Lform = new Sub(TWO, new Add(new Div(min_width, max_width), new Div(min_height, max_height)))

    this.sca = new Add(Lso, new Mult(new Constant(0.2), Lcd))
    this.isca = new Sum(new Square(Lso), Lcenter)
    this.fm = new Sum(Lso, Lform, Lcenter)
    this.grad_gt = this.GradGtLoss()
    this.tanh5 = this.TanhLoss(new Constant(5))
    this.tanh100 = this.TanhLoss(new Constant(100))
    this.atan100 = this.AtanLoss(new Constant(100))
}

GraphLoss.prototype.GradGtLoss = function() {
    let real_width = new Sub(this.real_x2, this.real_x1)
    let real_height = new Sub(this.real_y2, this.real_y1)

    let dx1 = new Sub(this.real_x1, this.pred_x1)
    let dy1 = new Sub(this.real_y1, this.pred_y1)
    let dx2 = new Sub(this.real_x2, this.pred_x2)
    let dy2 = new Sub(this.real_y2, this.pred_y2)

    let k1_x1 = new Add(new Mult(HALF, new Square(dx1)), new Mult(dx1, new Sign(dx1)))
    let k1_x2 = new Add(new Mult(HALF, new Square(dx2)), new Mult(dx2, new Sign(dx2)))
    let k1_x = new Div(new Add(k1_x1, k1_x2), real_width)

    let k1_y1 = new Add(new Mult(HALF, new Square(dy1)), new Mult(dy1, new Sign(dy1)))
    let k1_y2 = new Add(new Mult(HALF, new Square(dy2)), new Mult(dy2, new Sign(dy2)))
    let k1_y = new Div(new Add(k1_y1, k1_y2), real_height)

    return new Add(k1_x, k1_y)
}

GraphLoss.prototype.TanhLoss = function(k) {
    let real_width = new Sub(this.real_x2, this.real_x1)
    let real_height = new Sub(this.real_y2, this.real_y1)

    let dx1 = new Sub(this.real_x1, this.pred_x1)
    let dy1 = new Sub(this.real_y1, this.pred_y1)
    let dx2 = new Sub(this.real_x2, this.pred_x2)
    let dy2 = new Sub(this.real_y2, this.pred_y2)

    let k_x1 = new Add(new Mult(HALF, new Square(dx1)), new Div(new Log(new Cosh(new Mult(k, dx1))), k))
    let k_x2 = new Add(new Mult(HALF, new Square(dx2)), new Div(new Log(new Cosh(new Mult(k, dx2))), k))

    let k_y1 = new Add(new Mult(HALF, new Square(dy1)), new Div(new Log(new Cosh(new Mult(k, dy1))), k))
    let k_y2 = new Add(new Mult(HALF, new Square(dy2)), new Div(new Log(new Cosh(new Mult(k, dy2))), k))

    let Lx = new Div(new Add(k_x1, k_x2), real_width)
    let Ly = new Div(new Add(k_y1, k_y2), real_height)

    return new Add(Lx, Ly)
}

GraphLoss.prototype.AtanLossCoef = function(k, x) {
    return new Mult(TWO_OVER_PI, new Sub(new Mult(x, new Atan(new Mult(k, x))), new Div(new Log(new Add(ONE, new Square(new Mult(k, x)))), new Mult(TWO, k))))
}

GraphLoss.prototype.AtanLoss = function(k, needL2) {
    let real_width = new Sub(this.real_x2, this.real_x1)
    let real_height = new Sub(this.real_y2, this.real_y1)

    let dx1 = new Sub(this.real_x1, this.pred_x1)
    let dy1 = new Sub(this.real_y1, this.pred_y1)
    let dx2 = new Sub(this.real_x2, this.pred_x2)
    let dy2 = new Sub(this.real_y2, this.pred_y2)

    let k_x1 = this.AtanLossCoef(k, dx1)
    let k_x2 = this.AtanLossCoef(k, dx2)

    let k_y1 = this.AtanLossCoef(k, dy1)
    let k_y2 = this.AtanLossCoef(k, dy2)

    let Lx = new Div(new Add(k_x1, k_x2), real_width)
    let Ly = new Div(new Add(k_y1, k_y2), real_height)

    return new Add(Lx, Ly)
}

GraphLoss.prototype.GradLoss = function() {
    let real_width = this.real_x2.value - this.real_x1.value
    let real_height = this.real_y2.value - this.real_y1.value

    let pred_width = this.pred_x2.value - this.pred_x1.value
    let pred_height = this.pred_y2.value - this.pred_y1.value

    let min_width = Math.min(real_width, pred_width)
    let max_width = Math.max(real_width, pred_width)

    let min_height = Math.min(real_height, pred_height)
    let max_height = Math.max(real_height, pred_height)

    // int nodes
    let int_x1 = Math.max(this.real_x1.value, this.pred_x1.value)
    let int_x2 = Math.min(this.real_x2.value, this.pred_x2.value)
    let int_y1 = Math.max(this.real_y1.value, this.pred_y1.value)
    let int_y2 = Math.min(this.real_y2.value, this.pred_y2.value)

    let int_width = int_x2 - int_x1
    let int_height = int_y2 - int_y1

    // convex nodes
    let convex_x1 = Math.min(this.real_x1.value, this.pred_x1.value)
    let convex_x2 = Math.max(this.real_x2.value, this.pred_x2.value)
    let convex_y1 = Math.min(this.real_y1.value, this.pred_y1.value)
    let convex_y2 = Math.max(this.real_y2.value, this.pred_y2.value)

    let convex_width = convex_x2 - convex_x1
    let convex_height = convex_y2 - convex_y1

    let dx1 = this.real_x1.value - this.pred_x1.value
    let dy1 = this.real_y1.value - this.pred_y1.value
    let dx2 = this.real_x2.value - this.pred_x2.value
    let dy2 = this.real_y2.value - this.pred_y2.value

    return {
        loss: Math.abs(dx1) + Math.abs(dy1) + Math.abs(dx2) + Math.abs(dy2),
        dx1: 1 / convex_width * ((1 - Math.sign(dx1)) / 2 - (1 + Math.sign(dx1)) / 2 * (int_width + 1) / (convex_width + 1)),
        dy1: 1 / convex_height * ((1 - Math.sign(dy1)) / 2 - (1 + Math.sign(dy1)) / 2 * (int_height + 1) / (convex_height + 1)),
        dx2: 1 / convex_width * ((1 - Math.sign(dx2)) / 2 * (int_width + 1) / (convex_width + 1) - (1 + Math.sign(dx2)) / 2),
        dy2: 1 / convex_height * ((1 - Math.sign(dy2)) / 2 * (int_height + 1) / (convex_height + 1) - (1 + Math.sign(dy2)) / 2)
    }
}

GraphLoss.prototype.Evaluate = function(realBox, predBox, name) {
    this.real_x1.SetValue(realBox.nx1)
    this.real_y1.SetValue(realBox.ny1)
    this.real_x2.SetValue(realBox.nx2)
    this.real_y2.SetValue(realBox.ny2)

    this.pred_x1.SetValue(predBox.nx1)
    this.pred_y1.SetValue(predBox.ny1)
    this.pred_x2.SetValue(predBox.nx2)
    this.pred_y2.SetValue(predBox.ny2)

    if (name == 'Grad')
        return this.GradLoss()

    let loss = null

    if (name == 'IoU') {
        loss = this.iou
    }
    else if (name == 'DIoU') {
        loss = this.diou
    }
    else if (name == 'CIoU') {
        loss = this.ciou
    }
    else if (name == 'GIoU') {
        loss = this.giou
    }
    else if (name == 'SCA') {
        loss = this.sca
    }
    else if (name == 'ISCA') {
        loss = this.isca
    }
    else if (name == 'FM') {
        loss = this.fm
    }
    else if (name == 'gradGT') {
        loss = this.grad_gt
    }
    else if (name == 'tanh5') {
        loss = this.tanh5
    }
    else if (name == 'tanh100') {
        loss = this.tanh100
    }
    else if (name == 'atan100') {
        loss = this.atan100
    }
    else
        throw "unknown loss '" + name + "'"

    let L = loss.Forward()
    loss.Backward(1)

    return {
        loss: L,
        dx1: this.pred_x1.grad,
        dy1: this.pred_y1.grad,
        dx2: this.pred_x2.grad,
        dy2: this.pred_y2.grad,
    }
}
