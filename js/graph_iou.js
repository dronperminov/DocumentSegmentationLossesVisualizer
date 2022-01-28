function GraphIoU() {
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

    this.scale = new Constant()

    // intersection nodes
    let int_x1 = new Max(this.real_x1, this.pred_x1)
    let int_x2 = new Min(this.real_x2, this.pred_x2)

    let int_y1 = new Max(this.real_y1, this.pred_y1)
    let int_y2 = new Min(this.real_y2, this.pred_y2)

    // real sizes
    let real_width = new Sub(this.real_x2, this.real_x1)
    let real_height = new Sub(this.real_y2, this.real_y1)
    let real_area = new Mult(real_width, real_height)

    // pred sizes
    let pred_width = new Sub(this.pred_x2, this.pred_x1)
    let pred_height = new Sub(this.pred_y2, this.pred_y1)
    let pred_area = new Mult(pred_width, pred_height)

    // intersection sizes
    let int_width = new Clamp(new Sub(int_x2, int_x1), 0)
    let int_height = new Clamp(new Sub(int_y2, int_y1), 0)
    let int_area = new Mult(int_width, int_height)

    let union_area = new Sub(new Add(real_area, pred_area), int_area)

    this.iou = new Mult(new Div(int_area, union_area), this.scale)

    // DIoU and CIoU calculation
    let cw = new Sub(new Max(this.pred_x2, this.real_x2), new Min(this.pred_x1, this.real_x1))
    let ch = new Sub(new Max(this.pred_y2, this.real_y2), new Min(this.pred_y1, this.real_y1))
    let c2 = new Add(new Square(cw), new Square(ch))

    let arg1 = new Sub(new Add(this.real_x1, this.real_x2), new Add(this.pred_x1, this.pred_x2))
    let arg2 = new Sub(new Add(this.real_y1, this.real_y2), new Add(this.pred_y1, this.pred_y2))

    let rho2 = new Div(new Add(new Square(arg1), new Square(arg2)), new Constant(4))

    let a1 = new Atan(new Div(real_width, real_height))
    let a2 = new Atan(new Div(pred_width, pred_height))

    let v = new Mult(new Constant(4 / (Math.PI * Math.PI)), new Square(new Sub(a2, a1)))
    let alpha = new NoGrad(new Div(v, new Add(new Sub(v, this.iou), new Constant(1 + 1e-8))))

    let c_area = new Add(new Mult(cw, ch), new Constant(1e-8))

    // loss function graphs
    this.ciou = new Sub(this.iou, new Add(new Div(rho2, c2), new Mult(v, alpha)))
    this.diou = new Sub(this.iou, new Div(rho2, c2))
    this.giou = new Sub(this.iou, new Div(new Sub(c_area, union_area), c_area))

    // convex nodes
    let convex_x1 = new Min(this.real_x1, this.pred_x1)
    let convex_x2 = new Max(this.real_x2, this.pred_x2)

    let convex_y1 = new Min(this.real_y1, this.pred_y1)
    let convex_y2 = new Max(this.real_y2, this.pred_y2)

    let wmin = new Sub(int_x2, int_x1)
    let hmin = new Sub(int_y2, int_y1)

    let wmax = new Sub(convex_x2, convex_x1)
    let hmax = new Sub(convex_y2, convex_y1)

    let so = new Add(new Div(wmin, wmax), new Div(hmin, hmax))

    let dx1 = new Square(new Sub(this.real_x1, this.pred_x1))
    let dy1 = new Square(new Sub(this.real_y1, this.pred_y1))
    let d_lt = new Add(dx1, dy1)

    let dx2 = new Square(new Sub(this.real_x2, this.pred_x2))
    let dy2 = new Square(new Sub(this.real_y2, this.pred_y2))
    let d_rb = new Add(dx2, dy2)

    let dcx = new Square(new Sub(convex_x2, convex_x1))
    let dcy = new Square(new Sub(convex_y2, convex_y1))
    let d_diag = new Add(dcx, dcy)

    let Lso = new Sub(new Constant(2), so)
    let Lcd = new Add(new Div(d_lt, d_diag), new Div(d_rb, d_diag))

    this.sca = new Mult(this.scale, new Sub(so, new Add(new Constant(1), new Mult(new Constant(0.2), Lcd))))
}

GraphIoU.prototype.Evaluate = function(realBox, predBox, scale, iouType) {
    this.real_x1.SetValue(realBox.nx1)
    this.real_y1.SetValue(realBox.ny1)
    this.real_x2.SetValue(realBox.nx2)
    this.real_y2.SetValue(realBox.ny2)

    this.pred_x1.SetValue(predBox.nx1)
    this.pred_y1.SetValue(predBox.ny1)
    this.pred_x2.SetValue(predBox.nx2)
    this.pred_y2.SetValue(predBox.ny2)

    this.scale.SetValue(scale)

    let loss = this.iou

    if (iouType == 'DIoU') {
        loss = this.diou
    }
    else if (iouType == 'CIoU') {
        loss = this.ciou
    }
    else if (iouType == 'GIoU') {
        loss = this.giou
    }
    else if (iouType == 'SCA') {
        loss = this.sca
    }

    let L = loss.Forward()
    loss.Backward(1)

    return {
        loss: 1 - L,
        dx1: -this.pred_x1.grad,
        dx2: -this.pred_x2.grad,
        dy1: -this.pred_y1.grad,
        dy2: -this.pred_y2.grad,
    }
}
