const fragmentShader = `
#define MAX_STEPS 128
#define AA 1
#define MIN_DISTANCE 0.01
#define MAX_DISTANCE 100.
#define T_MAX 50.
#define PI 3.14159265359
uniform vec2 iResolution;
uniform float iSpeed;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 iSphereColor;
uniform vec3 iObjectColor;
uniform float iShadows;
uniform vec3 iRotate;
uniform int iContinuousRotate;
const vec4 GroundColor = vec4(1);
float colorIntensity = 1.;
vec3 difColor = vec3(1.0, 1.0, 1.0);

mat2 Rotate(float a) {
    float s=sin(a); 
    float c=cos(a);
    return mat2(c,-s,s,c);
}
vec3 roty(vec3 p,float angle){
  float s = sin(angle),c = cos(angle);
    mat3 rot = mat3(
      c, 0.,-s,
        0.,1., 0.,
        s, 0., c
    );
    return p*rot; 
}
mat3 rotateX(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        vec3(1, 0, 0),
        vec3(0, c, -s),
        vec3(0, s, c)
    );
}
mat3 rotateZ(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        vec3(c, -s, 0),
        vec3(s, c, 0),
        vec3(0, 0, 1)
    );
}
mat3 rotateY(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        vec3(c, 0, s),
        vec3(0, 1, 0),
        vec3(-s, 0, c)
    );
}
// Plane - exact
float planeSDF(vec3 p,vec4 n) {
    // n must be normalized
    return dot(p,n.xyz)+n.w;
}
float sdBox( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
vec4 unionSDF(vec4 a, vec4 b) {
    return a.w < b.w? a : b;
}

//ADD OCTAHEDRON
float sdOctahedron( vec3 p, float s)
{
  p = abs(p);
  return (p.x+p.y+p.z-s)*0.57735027;
}
//ADD SPHERE
float sdSphere(vec3 p,float s){
    return length(p)-s;
}

vec4 opSmoothUnion( vec4 d1, vec4 d2, float k ) {
    vec4 h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h); }

vec4 opSmoothSubtraction( vec4 d1, vec4 d2, float k ) {
    vec4 h = clamp( 0.5 - 0.5*(d2+d1)/k, 0.0, 1.0 );
    return mix( d2, -d1, h ) + k*h*(1.0-h); }

vec4 opSmoothIntersection( vec4 d1, vec4 d2, float k ) {
    vec4 h = clamp( 0.5 - 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) + k*h*(1.0-h); }    

vec4 map(vec3 p){
    float plane = dot(p,vec3(0.0,0.0,-1.0))+3.728;//vec3 Rotation
    //BLUE SPHERE POSTIOIN
    p = abs(p);

    vec3 spH = vec3(0.0,sin(iSpeed),0.);
    spH = p - spH;
	vec4 sphere = vec4(iSphereColor,sdSphere(spH,.8));

    // Plane
    vec4 p0 = vec4(GroundColor.rgb,plane);
    //Box
    //vec4 box = vec4(GroundColor.rgb,sdBox(p,vec3(5.)));
    //ROTATINON OF POS
    p*=rotateX(iRotate.x);
    p*= rotateY(iRotate.y);
    p*=rotateZ(iRotate.z);

    switch (iContinuousRotate) {
        case 1:
            p*=rotateX(-iSpeed);//ROTATE POSITION
            break;
        case 2:
            p*=rotateY(-iSpeed);
            break;
        case 3:
            p*=rotateZ(-iSpeed);
            break;
        }

    p.y = abs(p.y);

    //SPHERE POSTION
    vec3 oJp = vec3(0.,1.5,0.000); // Position
    oJp = p - oJp;

    // Octahedron POSTION
    vec3 o0p = vec3(0.,.8,0.); // Position
    o0p = p - o0p;
    //o0p.xy *= Rotate(-iSpeed); // Rotate on one axis
   	// vec4 ll = vec4(SphereColor.rgb,sdSphere(oJp,1.8));
   	// vec4 pM = vec4(BoxColor.rgb,sdOctahedron(o0p,2.));
   	// vec4 mm = abs(differenceSDF(ll,pM));
    vec4 octWithsph = vec4(iObjectColor,max(sdOctahedron(o0p,2.),-sdSphere(oJp,1.8)));
   
    
    // Scene
    vec4 scene = vec4(0.);
    scene = opSmoothUnion(octWithsph,sphere,1.0);
    scene = unionSDF(scene,p0);
    return scene;
}
float RayMarch(vec3 ro,vec3 rd, inout vec3 dColor){
    float dO=0.;
    for(int i=0;i<MAX_STEPS;i++)
    {
        if(dO>MAX_DISTANCE)
            break;
 
        vec3 p=ro+rd*dO;
        vec4 ds=vec4(map(p));
 
        if(ds.w<MIN_DISTANCE)
        {
            dColor = ds.rgb;
            break;
        }
        dO+=ds.w;
         
    }
    return dO;
}

vec3 GetNormal(vec3 p)
{
    float d=map(p).w;
    vec2 e=vec2(.01,0);
     
    vec3 n=d-vec3(
        map(p-e.xyy).w,
        map(p-e.yxy).w,
        map(p-e.yyx).w);
         
  return normalize(n);
}
     
vec3 diffuseLighting(vec3 p,vec3 c){
    vec3 color = c.rgb * colorIntensity;

    vec3 lightPosition = vec3(0,1.,-3.5);
    
    vec3 light = normalize(lightPosition - p);
    vec3 normal = GetNormal(p);
    float diffuse = clamp(dot(normal,light),0.,1.);
     vec3 n=GetNormal(p);
    float d=RayMarch(p+n*MIN_DISTANCE*2.,light,difColor);
     
    if(d<length(light-p))diffuse*= iShadows;//SHADOWS
    return diffuse*color;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    // camera movement	
	float an = 0.5*(iTime-10.0);
	//vec3 ro = 1.2*vec3( 3.5*cos(an), 0.0, 3.5*sin(an) );
    
    // float an = -1.5;
    vec3 ro = vec3(0,0.0,-4.5);

    vec3 ta = vec3( 0.0, -0.0, 0.0 );
    // camera matrix
    vec3 ww = normalize( ta - ro );
    vec3 uu = normalize( cross(ww,vec3(0.0,1.0,0.0) ) );
    vec3 vv = normalize( cross(uu,ww));
   
    // render    
    vec3 tot = vec3(0.0);
    #if AA>1
    for( int m=0; m<AA; m++ )
    for( int n=0; n<AA; n++ )
    {
        // pixel coordinates
        vec2 o = vec2(float(m),float(n)) / float(AA) - 0.5;
        vec2 p = (2.0*(fragCoord+o)-iResolution.xy)/iResolution.y;
        #else    
        vec2 p = (2.0*fragCoord-iResolution.xy)/iResolution.y;
        #endif

	    // create view ray
        vec3 rd = normalize( p.x*uu + p.y*vv + 1.5*ww );
        rd.zy *= Rotate(PI*iMouse.y*0.2);//CAMERA ROTATION
        rd.xz *= Rotate(PI*iMouse.x*0.2);//CAMERA ROTATION
         
        // raymarch
        const float tmax = float(MAX_STEPS);
        float t = 0.0;
        for( int i=0; i<256; i++ )
        {

            vec3 pos = ro + t*rd;
            float h = map(pos).a;
            if( h<0.0001 || t>tmax ) break;//CHANGE TO T_MAX TO SKYBOX

            vec4 ds=vec4(map(pos));
 
            if(ds.w<MIN_DISTANCE)
            {
                difColor = ds.rgb;
                break;
            }
            t += ds.w/2.;
        }
        
        // shading/lighting	
        vec3 col = vec3(0.0);
        if( t<tmax )//T_MAX
        {
            //float d = RayMarch(ro,rd,difColor);

            vec3 pos = ro + t*rd;
            vec3 nor = GetNormal(pos);
            float dif = clamp( dot(nor,vec3(0.57703)), 0.0, 1.0 );
            float amb = 0.5 + 0.5*dot(nor,vec3(0.0,1.0,0.0));
            //col = vec3(0.2,0.3,0.4)*amb + vec3(0.85,0.75,0.65)*dif;
            //col = vec3(0.1,0.1,0.1)*amb + diffuseLighting(pos,difColor);
            col = diffuseLighting(pos,difColor);
        }

        // gamma        
        col = sqrt( col );
	    tot += col;
    #if AA>1
    }
    tot /= float(AA*AA);
    #endif

	fragColor = vec4( tot, 1.0 );
}

void main() {
   mainImage(gl_FragColor, gl_FragCoord.xy);
}`

export default fragmentShader;