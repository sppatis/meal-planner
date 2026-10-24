/**
 * Ninja Dual Zone methods. Zone 1 and Zone 2 are the two drawers.
 * MATCH copies one zone's settings to the other; SYNC makes both zones finish together.
 * The main recipe prep (marinades, sauces, hob steps) still applies unless replaced here.
 */
export const AIR_FRYER: Record<string, string[]> = {
  "bbq-chicken-jackets": [
    "Microwave the pricked potatoes for 10-12 minutes until just soft.",
    "Zone 1: potatoes, sprayed with oil and salted. AIR FRY 200C for 10 minutes.",
    "Zone 2: chicken strips tossed in the paprika and a few sprays of oil. AIR FRY 190C for 10 minutes.",
    "Press SYNC and START. Shake Zone 2 halfway, then toss the chicken in the BBQ sauce for the last 2 minutes.",
  ],
  "chilli-loaded-jackets": [
    "Microwave the pricked potatoes for 10-12 minutes while the chilli simmers on the hob.",
    "Split the potatoes between both zones, spray and salt. AIR FRY 200C for 12-15 minutes, press MATCH, then START.",
    "This cuts the jackets from an hour in the oven to about 25 minutes.",
  ],
  "sausage-mash-onion-gravy": [
    "Zone 1: sausages. AIR FRY 180C for 14 minutes, turning halfway.",
    "Use Zone 2 for the carrots, tossed in a few sprays of oil: ROAST 190C for 14 minutes. Press SYNC.",
    "Make the mash, onion gravy and green beans on the hob as normal. No need to heat the oven.",
  ],
  "lemon-herb-chicken-traybake": [
    "Zone 1: halved new potatoes tossed in half the oil. ROAST 200C for 30 minutes.",
    "Zone 2: chicken, courgette, pepper, onion and garlic with the remaining oil, herbs and lemon. ROAST 190C for 22 minutes.",
    "Press SYNC and START. Shake both halfway, and add the cherry tomatoes to Zone 2 for the last 5 minutes.",
  ],
  "smoky-chicken-chorizo-traybake": [
    "Zone 1: cubed potatoes, sprayed and seasoned. ROAST 200C for 28 minutes.",
    "Zone 2: chicken tossed in the paprika and oregano, with the chorizo, peppers, onion and garlic. ROAST 190C for 20 minutes.",
    "Press SYNC and START, shaking both halfway. Tip everything into a bowl and stir through the spinach.",
  ],
  "pork-steaks-crushed-potatoes": [
    "Boil the potatoes and broccoli on the hob as normal.",
    "Zone 1: seasoned pork steaks. AIR FRY 200C for 12 minutes, turning halfway. Brush with the mustard and honey for the last 2 minutes.",
  ],
  "halloumi-veg-traybake": [
    "Zone 1: courgette, peppers, onion and chickpeas with spray oil and oregano. ROAST 200C for 18 minutes.",
    "Zone 2: halloumi slices and cherry tomatoes, lightly sprayed. AIR FRY 200C for 8 minutes.",
    "Press SYNC and START. Make the couscous while they cook.",
  ],
  "chicken-katsu-curry": [
    "Coat the chicken as in the main method, then spray well on both sides.",
    "Split the chicken between both zones in a single layer. AIR FRY 200C for 14 minutes, press MATCH, then START. Turn halfway.",
    "Make the sauce and rice on the hob while it cooks.",
  ],
  "kfc-style-chicken": [
    "Zone 1: wedges, sprayed and seasoned. AIR FRY 200C for 25 minutes.",
    "Zone 2: cornflake-coated chicken strips in a single layer, sprayed well. AIR FRY 190C for 15 minutes.",
    "Press SYNC and START. Shake the wedges and turn the chicken halfway. Microwave the sweetcorn.",
  ],
  "chicken-doner-kebab": [
    "Zone 1: marinated chicken thighs. AIR FRY 200C for 18 minutes, turning halfway. Rest for 3 minutes, then slice thinly.",
    "Warm the pittas in Zone 2 for the last 2 minutes on AIR FRY 180C.",
  ],
  "beef-burgers-sweet-potato-fries": [
    "Zone 1: sweet potato fries tossed with spray oil and paprika. AIR FRY 200C for 22 minutes.",
    "Zone 2: burgers. AIR FRY 190C for 14 minutes, turning halfway. Add the cheese for the last minute.",
    "Press SYNC and START, and shake the fries twice. Toast the buns in Zone 2 once the burgers are out.",
  ],
  "salt-pepper-chicken": [
    "Toss the chicken in the cornflour mix and spray well.",
    "Split between both zones. AIR FRY 200C for 14 minutes, press MATCH, then START. Shake halfway.",
    "Stir-fry the veg in the wok while it cooks, then toss everything together.",
  ],
  "peri-peri-chicken": [
    "Zone 1: wedges sprinkled with half the paprika. AIR FRY 200C for 25 minutes.",
    "Zone 2: peri-peri coated chicken thighs. AIR FRY 200C for 20 minutes.",
    "Press SYNC and START. Shake the wedges and turn the chicken halfway.",
  ],
  "crispy-chilli-beef": [
    "Toss the beef in the cornflour and five spice, spread over both zones and spray well.",
    "AIR FRY 200C for 10 minutes, press MATCH, then START. Shake halfway. It gets crispier than in the wok and uses less oil.",
    "Stir-fry the veg and sauce on the hob, then toss in the beef.",
  ],
  "chicken-tikka-masala": [
    "Zone 1: yogurt-marinated chicken chunks. AIR FRY 200C for 12 minutes, shaking halfway, until charred at the edges.",
    "Warm the mini naans in Zone 2 for the last 2 minutes on AIR FRY 180C.",
  ],
  "homemade-pizza": [
    "Halve each base so it fits the drawers, then top as normal.",
    "One half-base per zone. AIR FRY 190C for 7 minutes, press MATCH, then START. Repeat for the second batch.",
  ],
  "greek-chicken-souvlaki": [
    "Zone 1: marinated chicken chunks. AIR FRY 200C for 12 minutes, shaking halfway.",
    "Warm the pittas in Zone 2 for the last 2 minutes on AIR FRY 180C.",
  ],
  "chicken-bacon-wraps": [
    "Zone 1: chicken slices, sprayed. AIR FRY 190C for 12 minutes.",
    "Zone 2: bacon medallions. AIR FRY 190C for 8 minutes.",
    "Press SYNC and START, then build the wraps.",
  ],
  "honey-mustard-chicken-couscous": [
    "Zone 1: courgette, peppers, onion and cherry tomatoes, sprayed. ROAST 200C for 20 minutes.",
    "Zone 2: chicken brushed with the honey mustard glaze. AIR FRY 180C for 20 minutes.",
    "Press SYNC and START. Shake the veg halfway, and make the couscous while it cooks.",
  ],
  "veggie-fajitas": [
    "Split the peppers and onion between both zones with spray oil and the spices. AIR FRY 200C for 12 minutes, press MATCH, then START. Shake halfway.",
    "Warm the beans on the hob with the lime juice and build the wraps as normal.",
  ],
  "bean-cheese-quesadillas": [
    "Fill and fold the wraps as in the main method.",
    "One quesadilla per zone. AIR FRY 180C for 5 minutes, press MATCH, then START. Flip halfway. Repeat for the third.",
  ],
  "sausage-bean-casserole": [
    "Brown the sausages in Zone 1: AIR FRY 190C for 10 minutes, shaking halfway, while you soften the onions and peppers on the hob.",
    "Add the sausages to the sauce and carry on as normal.",
  ],
  "chicken-leek-bean-casserole": [
    "Bake the part-baked baguette in Zone 1: BAKE 180C for 6 minutes.",
  ],
  "mexican-bean-jackets": [
    "Microwave the pricked potatoes for 10-12 minutes while the beans simmer.",
    "Split the potatoes between both zones, spray and salt. AIR FRY 200C for 8 minutes, press MATCH, then START, for crispy skins.",
  ],
  "sweet-chilli-halloumi-bowls": [
    "Zone 1: halloumi cubes, lightly sprayed. AIR FRY 200C for 8 minutes.",
    "Zone 2: peppers and broccoli, sprayed. AIR FRY 200C for 10 minutes.",
    "Press SYNC and START, shaking both halfway. Toss everything in the sweet chilli, soy and lime.",
  ],
  "veg-feta-pasta-bake": [
    "Split the courgette, peppers, onion and tomatoes between both zones, sprayed. ROAST 200C for 15 minutes, press MATCH, then START. Shake halfway.",
    "Carry on with the pasta and bake as normal. Roasting the veg in the Ninja saves 20 minutes of oven time.",
  ],
  "sweet-potato-chicken-hash": [
    "Zone 1: microwaved sweet potato cubes, pepper and onion with the spices and spray oil. AIR FRY 200C for 15 minutes.",
    "Zone 2: chicken pieces, sprayed. AIR FRY 200C for 12 minutes. Press SYNC and START, shaking both halfway.",
    "Combine everything in a frying pan, then add the eggs as normal.",
  ],
};
