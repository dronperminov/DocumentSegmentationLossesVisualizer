function PIoU(info) {
    if (!info.haveIntersection || info.intersectionBlackCount == 0)
        return 0

    return info.intersectionBlackCount / info.unionBlackCount
}

function BWIoU(info, w = 0.7, lambda = 10) {
    if (!info.haveIntersection)
        return 0

    let int = info.intersectionBlackCount * w + info.intersectionWhiteCount * (1 - w)
    let union = info.unionBlackCount * w + info.unionWhiteCount * (1 - w)

    return int / (union + (info.unionBlackCount - info.intersectionBlackCount) * lambda)
}

function WeightedBWIoU(info, lambda = 10) {
    if (!info.haveIntersection)
        return 0

    let intW = info.intersectionWhiteCount / info.intersectionArea
    let unionW = info.unionWhiteCount / info.unionArea

    let int = info.intersectionBlackCount * intW + info.intersectionWhiteCount * (1 - intW)
    let union = info.unionBlackCount * unionW + info.unionWhiteCount * (1 - unionW)

    return int / (union + (info.unionBlackCount - info.intersectionBlackCount) * lambda)
}