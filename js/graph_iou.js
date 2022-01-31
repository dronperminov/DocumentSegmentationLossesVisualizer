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

    this.iou = new Div(int_area, union_area)

    // DIoU and CIoU calculation
    let rho2 = new SquareNorm(pred_center_x, real_center_x, pred_center_y, real_center_y) // квадрат расстояния между центрами
    let v = new Mult(new Constant(4 / (Math.PI * Math.PI)), new Square(new Sub(new Atan(pred_aspect_ratio), new Atan(real_aspect_ratio))))
    let alpha = new NoGrad(new Div(v, new Add(new Sub(v, this.iou), new Constant(1 + 1e-8))))

    this.ciou = new Sub(this.iou, new Add(new Div(rho2, convex_diag), new Mult(v, alpha)))
    this.diou = new Sub(this.iou, new Div(rho2, convex_diag))
    this.giou = new Sub(this.iou, new Sub(ONE, new Div(union_area, convex_area)))

    let so = new Add(new Div(int_width, convex_width), new Div(int_height, convex_height))

    let d_lt = new SquareNorm(this.pred_x1, this.real_x1, this.pred_y1, this.real_y1)
    let d_rb = new SquareNorm(this.pred_x2, this.real_x2, this.pred_y2, this.real_y2)

    let Lso = new Sub(TWO, so)
    let Lcd = new Div(new Add(d_lt, d_rb), convex_diag)

    let so2 = new Sum(new Div(int_width, convex_width), new Div(int_height, convex_height), new Div(int_diag, convex_diag))
    let Lso2 = new Sub(THREE, so2)

    this.sca = new Sub(ONE, new Add(Lso, new Mult(new Constant(0.2), Lcd)))
    this.my = new Sub(ONE, new Sum(Lso2, new Mult(new Constant(0.2), Lcd)))
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
    else if (iouType == 'My') {
        loss = this.my
    }

    let L = loss.Forward()
    loss.Backward(scale)

    return {
        loss: 1 - L,
        dx1: -this.pred_x1.grad,
        dx2: -this.pred_x2.grad,
        dy1: -this.pred_y1.grad,
        dy2: -this.pred_y2.grad,
    }
}
