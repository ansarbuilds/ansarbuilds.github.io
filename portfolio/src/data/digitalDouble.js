// The digital double's build stages, shown on its page and in the film.
// One entry per stage worth showing. Verdicts are honest: most attempts failed.
export const STAGES = [
  { img: "s01.jpg", n: 1, title: "A head built from pure code", verdict: "dead end", tone: "text-rose",
    note: "Two photo outlines give a silhouette, not a face." },
  { img: "s02.jpg", n: 2, title: "FaceBuilder from 3 photos", verdict: "partial", tone: "text-amber",
    note: "Real 3D form, but still close to an average head." },
  { img: "s03.jpg", n: 3, title: "Particle hair", verdict: "dead end", tone: "text-rose",
    note: "Six tries. It looked like a knitted cap." },
  { img: "s04.jpg", n: 4, title: "FaceBuilder from 8 video frames", verdict: "kept", tone: "text-green",
    note: "Became the base of the final model." },
  { img: "s05.jpg", n: 5, title: "On-device photogrammetry", verdict: "measurement", tone: "text-[#b9a8ff]",
    note: "Hair came out like a beret, but its volume was right." },
  { img: "s08.jpg", n: 8, title: "Gaussian splat on my laptop GPU", verdict: "wrong format", tone: "text-cyan",
    note: "Best likeness by far, but a splat can't move its eyes." },
  { img: "s09.jpg", n: 9, title: "Real eyeballs", verdict: "kept", tone: "text-green",
    note: "Nine iterations to keep the whites inside the lids." },
  { img: "temple_after.jpg", n: 12, title: "Hair rebuilt around ears and temples", verdict: "shipped", tone: "text-green",
    note: "Ears traced from the mesh; no strand within 2.5 mm." },
];
