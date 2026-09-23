# Chronicling the adventures of me and my friends

## Introduction

Once a year I hike with my friends, we call the event _čundr_ and refer to ourselves as _Čundr boys_. The destination
changes every year. Once in two years we go abroad. The destinations were:

1. 2019 - Georgia (Lagodekhi, Tbilisi)
2. 2020 - Slovakia (Roháče, Liptovský Mikuláš)
3. 2021 - Czechia (Krušné Hory, Karlovy Vary)
4. 2022 - Montenegro (Prokletije Mountains, Podgorica)
5. 2023 - Czechia (Krkonoše, Hradec Králové)
6. 2024 - Bosnia and Herzegovina (Veliki Maglić, Sarajevo)
7. 2025 - Czechia (Jeseníky, Olomouc)
8. 2026 - Kosovo (Šar Planina, Pristina)

We always do 3-4 days of hiking followed by a short stay in a city.

The repository here hosts my personal blog. I used the Zola static site generator and Bootstrap JS framework.

I would like to add a chronicle of ČB adventures to my blog. I picture it on the same level as _Grains_ and _Blog_.
I would prefer to use a template for each chronicle _entry_ leveraging Zola as I am going to be adding new ones, but I
am not sure about the technical feasibility. I need to evaluate that with you.

## The Chronicle

On the index of the chronicle, I would like to have a timeline scrolling down into the past like this

```text
                                                                     
                               |                                     
 2026, Kosovo, Šar planina ----|                                     
                               |                                     
                               |---- 2025, Czechia, Jeseníky         
                               |                                     
                       ... ----|                                     
                               |                                     
                               |---- ...                             
                               |                                     
                               |                                     
                                                                     
```

It would be nice to have one photo as a thumbnail for each entry, but again not sure of feasibility, need to
evaluate.

A big unknown for me is which technology to pick for this type of page. I need you to help me brainstorm ways how
to do it. Then I will evaluate your suggestions.

## The _Entry_ in detail

The entries can be simple. I can see them having:

* Destination = Hiking destination + City
* Flag
* A small paragraph describing the experience
* A small gallery of pictures (let's start with 16)

I know Zola has some infrastructure for manipulating images, but I am not sure if it is the right technology for this.
Again - need to evaluate with you.

Another big unknown for me is where to host the images. Are there some free hosting options? Or will I need to
store them in the repository?
